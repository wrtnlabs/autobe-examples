import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_member_listing_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Call PATCH /erpHrm/admin/members with status='active' - should return only active members
  const activeMembersResponse = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(activeMembersResponse);
  // 3. Validate response contains pagination metadata with total records count
  TestValidator.equals(
    "active response has pagination",
    activeMembersResponse.pagination !== null &&
      activeMembersResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "active response pagination records is non-negative",
    activeMembersResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active response pagination pages is non-negative",
    activeMembersResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "active response pagination current is 1 or greater",
    activeMembersResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "active response pagination limit is positive",
    activeMembersResponse.pagination.limit > 0,
  );
  // 4. Verify each member record has required fields: id, email, displayName, avatarUri, phone, createdAt
  for (const member of activeMembersResponse.data) {
    typia.assert(member);
    TestValidator.equals(
      "member has id",
      member.id !== null && member.id !== undefined,
      true,
    );
    TestValidator.equals(
      "member has email",
      member.email !== null && member.email !== undefined,
      true,
    );
    TestValidator.equals(
      "member has displayName",
      member.displayName !== null && member.displayName !== undefined,
      true,
    );
    TestValidator.equals(
      "member has avatarUri (can be null)",
      "avatarUri" in member,
      true,
    );
    TestValidator.equals(
      "member has phone (can be null)",
      "phone" in member,
      true,
    );
    TestValidator.equals(
      "member has createdAt",
      member.createdAt !== null && member.createdAt !== undefined,
      true,
    );
    // 5. Verify passwordHash field is NOT included in any response
    TestValidator.equals(
      "member does NOT have passwordHash",
      "passwordHash" in member,
      false,
    );
  }
  // 6. Call PATCH /erpHrm/admin/members with status='all' - should return both active and deleted members
  const allMembersResponse = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        status: "all",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(allMembersResponse);
  // Validate all response has pagination
  TestValidator.equals(
    "all response has pagination",
    allMembersResponse.pagination !== null &&
      allMembersResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "all response pagination records is non-negative",
    allMembersResponse.pagination.records >= 0,
  );
  // Verify members in 'all' response also have required fields and no passwordHash
  for (const member of allMembersResponse.data) {
    typia.assert(member);
    TestValidator.equals(
      "member has id",
      member.id !== null && member.id !== undefined,
      true,
    );
    TestValidator.equals(
      "member has email",
      member.email !== null && member.email !== undefined,
      true,
    );
    TestValidator.equals(
      "member has displayName",
      member.displayName !== null && member.displayName !== undefined,
      true,
    );
    TestValidator.equals(
      "member does NOT have passwordHash",
      "passwordHash" in member,
      false,
    );
  }
}
