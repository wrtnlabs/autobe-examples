import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully retrieve details of another super administrator account.
 *
 * Validates the complete administrator retrieval flow including super administrator authentication, account creation, and viewing another super administrator's profile. Ensures that the response contains complete administrator information with correct grade level and member details.
 *
 * Special attention is given to verifying that the grade is 'super', the member relationship is properly populated with customerProfile containing display_name and phone_number, and that lifecycle timestamps are consistent.
 *
 * 1. First super administrator registers and authenticates.
 * 2. Second super administrator account is created.
 * 3. First super administrator retrieves second administrator's details.
 * 4. Validates administrator profile structure, grade level, member information, and timestamp consistency.
 */
export async function test_api_administrator_view_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator (viewer)
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await authorize_super_admin_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(viewerAuth);
  // 2. Create second super administrator (target to view)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_super_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(targetAuth);
  // 3. First super admin retrieves second administrator's details
  const administrator =
    await api.functional.shoppingMall.superAdmin.administrators.at(
      viewerConnection,
      {
        administratorId: targetAuth.id,
      },
    );
  typia.assert(administrator);
  // 4. Validate administrator profile
  TestValidator.equals(
    "administrator id matches",
    administrator.id,
    targetAuth.id,
  );
  TestValidator.equals("grade is super", administrator.grade, "super");
  TestValidator.predicate(
    "deletedAt is null",
    administrator.deletedAt === null,
  );
  TestValidator.predicate(
    "createdAt <= updatedAt",
    new Date(administrator.createdAt) <= new Date(administrator.updatedAt),
  );
  // 5. Validate member information
  TestValidator.equals(
    "member id exists",
    typeof administrator.member.id,
    "string",
  );
  TestValidator.equals(
    "member email matches target",
    administrator.member.email,
    targetAuth.email,
  );
  TestValidator.predicate(
    "member status is active",
    administrator.member.status === "active",
  );
  TestValidator.predicate(
    "member has customerProfile",
    administrator.member.customerProfile !== null,
  );
  // 6. Validate customerProfile details
  if (administrator.member.customerProfile !== null) {
    TestValidator.equals(
      "display_name exists",
      typeof administrator.member.customerProfile.display_name,
      "string",
    );
    TestValidator.equals(
      "phone_number exists",
      typeof administrator.member.customerProfile.phone_number,
      "string",
    );
    TestValidator.predicate(
      "customerProfile deletedAt is null",
      administrator.member.customerProfile.deleted_at === null,
    );
  }
}
