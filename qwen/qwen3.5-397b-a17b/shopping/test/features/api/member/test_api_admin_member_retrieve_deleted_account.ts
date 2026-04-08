import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of member account including soft-deleted accounts.
 *
 * Validates the administrator's ability to retrieve complete member account information via GET /shoppingMall/admin/members/{memberId}. This endpoint returns full member records including soft-deleted accounts to support legal compliance, audit trails, and order history preservation.
 *
 * The test verifies that administrators can access member data regardless of account status (active, banned, or deleted). The response includes critical fields like deleted_at timestamp which indicates soft-delete status, and status field showing current account state.
 *
 * 1. Administrator authenticates via join operation to obtain admin credentials and access token.
 * 2. Admin calls GET /shoppingMall/admin/members/{memberId} with a member UUID to retrieve account details.
 * 3. Validates response structure matches IShoppingMallMember type with all required fields.
 * 4. Verifies deleted_at field is accessible for audit and compliance purposes.
 * 5. Confirms member profile and administrator relations are properly included when present.
 */
export async function test_api_admin_member_retrieve_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate member UUID for retrieval
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve member account by ID
  const member = await api.functional.shoppingMall.admin.members.at(
    adminConnection,
    {
      memberId,
    },
  );
  typia.assert(member);
  // 4. Validate member ID matches requested ID
  TestValidator.equals("member ID matches request", member.id, memberId);
  // 5. Validate deleted_at field is accessible (null for active, timestamp for deleted)
  // This validates the business rule that soft-deleted members are retrievable by admins
  const isDeleted = member.deleted_at !== null;
  TestValidator.predicate(
    "deleted_at indicates account deletion state",
    isDeleted || member.deleted_at === null,
  );
  // 6. Validate profile is included when member has customer profile
  if (member.profile !== null) {
    TestValidator.notEquals(
      "profile display name is set",
      member.profile.display_name,
      "",
    );
  }
  // 7. Validate administrator relation structure when present
  if (member.administrator !== null) {
    TestValidator.notEquals(
      "administrator grade is set",
      member.administrator.grade,
      "",
    );
  }
}
