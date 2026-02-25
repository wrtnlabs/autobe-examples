import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller registration with complete business profile information.
 * Verifies that shop name, description, and logo URL are properly saved
 * during registration and returned in the response.
 */
export async function test_api_seller_registration_business_info_complete(
  connection: api.IConnection,
): Promise<void> {
  // Create a seller connection for registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate complete business profile data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSeller.IJoin;
  // Register seller with complete business info
  const seller = await authorize_seller_join(sellerConnection, {
    body: joinInput,
  });
  typia.assert(seller);
  // Validate that all provided business information is correctly saved and returned
  TestValidator.equals("email matches input", seller.email, joinInput.email);
  TestValidator.equals(
    "shop name matches input",
    seller.shop_name,
    joinInput.shop_name,
  );
  TestValidator.equals(
    "shop description matches input",
    seller.shop_description,
    joinInput.shop_description,
  );
  TestValidator.equals(
    "logo image URL matches input",
    seller.logo_image_url,
    joinInput.logo_image_url,
  );
  // Validate account status and timestamps
  TestValidator.equals(
    "account status should be pending_approval",
    seller.account_status,
    "pending_approval",
  );
  TestValidator.predicate(
    "approval reason should be null for new registration",
    seller.approval_reason === null,
  );
  TestValidator.predicate(
    "created at timestamp should be valid",
    !!seller.created_at,
  );
  TestValidator.predicate(
    "updated at timestamp should be valid",
    !!seller.updated_at,
  );
  TestValidator.predicate(
    "deleted at should be null for new registration",
    seller.deleted_at === null,
  );
  // Validate authorization token structure
  TestValidator.predicate(
    "access token should be present",
    !!seller.token.access,
  );
  TestValidator.predicate(
    "refresh token should be present",
    !!seller.token.refresh,
  );
  TestValidator.predicate(
    "expiration timestamp should be valid",
    !!seller.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable until timestamp should be valid",
    !!seller.token.refreshable_until,
  );
}
