import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer profile retrieval for authenticated member.
 *
 * Validates that a registered member can successfully retrieve their own customer profile information through the GET /shoppingMall/member/profile endpoint. The test verifies the complete profile data structure including display name, phone number, timestamps, and the associated member account information.
 *
 * The customer profile is automatically created upon member registration and maintains a one-to-one relationship with the member account. This test ensures that the profile retrieval returns all required fields with proper formatting and that the member relationship is correctly established.
 *
 * 1. Register new member account using authorize_member_join utility with randomized credentials.
 * 2. Call GET /shoppingMall/member/profile with authenticated member connection.
 * 3. Validate profile contains all required fields: id, display_name, phone_number, created_at, updated_at, deleted_at.
 * 4. Validate member relationship contains id, email, status, created_at, and customerProfile reference.
 * 5. Verify member.email matches registration email and status is 'active'.
 * 6. Verify deleted_at is null indicating active profile.
 */
export async function test_api_customer_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: registrationEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve customer profile
  const profile =
    await api.functional.shoppingMall.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate business logic - email match
  TestValidator.equals(
    "member email matches registration",
    profile.member.email,
    registrationEmail,
  );
  // 4. Validate member status is active
  TestValidator.equals(
    "member status is active",
    profile.member.status,
    "active",
  );
  // 5. Validate profile is not deleted
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  // 6. Validate profile-member relationship consistency
  TestValidator.equals(
    "member id matches authorized id",
    profile.member.id,
    authorized.id,
  );
  // 7. Validate customerProfile reference matches profile id
  if (profile.member.customerProfile !== null) {
    TestValidator.equals(
      "customerProfile id matches profile id",
      profile.member.customerProfile.id,
      profile.id,
    );
  }
}
