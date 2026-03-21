import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_retrieval_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email,
        password: password satisfies string & tags.Format<"password">,
        href: "https://example.com/seller/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/seller" satisfies string &
          tags.Format<"uri">,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // Step 2: Login with the registered credentials
  const loggedInConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(loggedInConnection, {
    body: {
      email,
      password,
      href: "https://example.com/seller/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/seller" satisfies string &
        tags.Format<"uri">,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Step 3: Retrieve the authenticated seller's own profile
  const profile =
    await api.functional.ecommerceMall.seller.seller.profile.at(
      loggedInConnection,
    );
  typia.assert(profile);
  // Step 4: Validate complete profile structure matches IEcommerceMallSellerProfile
  TestValidator.equals(
    "profile id matches seller id",
    profile.id,
    sellerAuth.id,
  );
  TestValidator.predicate("shop name is non-empty", profile.name.length > 0);
  TestValidator.predicate(
    "shop description is non-empty",
    profile.description.length > 0,
  );
  TestValidator.predicate(
    "logo_uri field exists (nullable)",
    profile.logo_uri !== undefined,
  );
  TestValidator.predicate(
    "seller embedded info exists",
    profile.seller !== undefined,
  );
  TestValidator.equals(
    "seller id embedded matches",
    profile.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email embedded matches",
    profile.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "approval status embedded matches",
    profile.seller.approval_status,
    sellerAuth.approval_status,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null for active profile",
    profile.deleted_at,
    null,
  );
}
