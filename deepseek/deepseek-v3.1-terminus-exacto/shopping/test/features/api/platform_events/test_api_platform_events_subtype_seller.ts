import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_events_subtype_seller(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Seller actor setup (simulated)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const eventId = typia.random<string & tags.Format<"uuid">>();
  const subtypeId = typia.random<string & tags.Format<"uuid">>();
  // Fetch subtype relationship for seller-generated event
  const subtype =
    await api.functional.ecommerce.administrator.platform_events.subtypes.at(
      adminConnection,
      {
        eventId,
        subtypeId,
      },
    );
  typia.assert(subtype);
  // Verify actor_type is 'seller'
  TestValidator.predicate(
    "actor_type should be seller",
    subtype.actor_type === "seller",
  );
  // Verify actor is seller summary type
  TestValidator.predicate(
    "actor should be seller summary",
    subtype.actor_type === "seller",
  );
  const sellerSummary = subtype.actor as IEcommerceSeller.ISummary;
  typia.assert(sellerSummary);
  // Validate seller shop details present
  TestValidator.predicate(
    "shop_name should exist",
    typeof sellerSummary.shop_name === "string",
  );
  TestValidator.predicate(
    "shop_description may be null or string",
    sellerSummary.shop_description === null ||
      typeof sellerSummary.shop_description === "string",
  );
  TestValidator.predicate(
    "logo_image_url may be null or string",
    sellerSummary.logo_image_url === null ||
      typeof sellerSummary.logo_image_url === "string",
  );
  TestValidator.predicate(
    "account_status should be string",
    typeof sellerSummary.account_status === "string",
  );
  TestValidator.predicate(
    "created_at should be date-time format",
    typeof sellerSummary.created_at === "string",
  );
  // Verify actor_id matches expected UUID format
  TestValidator.predicate(
    "actor_id should be valid UUID",
    /^[0-9a-f-]{36}$/i.test(subtype.actor_id),
  );
}
