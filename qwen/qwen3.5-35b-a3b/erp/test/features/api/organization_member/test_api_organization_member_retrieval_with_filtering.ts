import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_member_retrieval_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create a new connection with the member's token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // 2. Test default pagination
  let result = await api.functional.hrms.member.organization_members.index(
    authenticatedConnection,
    { body: {} },
  );
  typia.assert(result);
  typia.assert(result.pagination);
  // Verify default pagination values (page=1, limit=20)
  TestValidator.equals("default page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    () => result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => result.pagination.pages >= 0,
  );
  // 3. Test custom pagination
  const customLimit = 5;
  const customPage = 2;
  const paginationResult =
    await api.functional.hrms.member.organization_members.index(
      authenticatedConnection,
      {
        body: {
          page: customPage,
          limit: customLimit,
        },
      },
    );
  typia.assert(paginationResult);
  typia.assert(paginationResult.pagination);
  TestValidator.equals(
    "custom page",
    paginationResult.pagination.current,
    customPage,
  );
  TestValidator.equals(
    "custom limit",
    paginationResult.pagination.limit,
    customLimit,
  );
  // 4. Test search by display name
  const searchMemberName = RandomGenerator.name();
  const searchResult =
    await api.functional.hrms.member.organization_members.index(
      authenticatedConnection,
      {
        body: {
          search: searchMemberName,
        },
      },
    );
  typia.assert(searchResult);
  typia.assert(searchResult.data);
  // Verify all returned members match the search term (case-insensitive partial match)
  for (const membership of searchResult.data) {
    const memberName = membership.member.display_name.toLowerCase();
    const memberEmail = membership.member.email.toLowerCase();
    const searchLower = searchMemberName.toLowerCase();
    // Either display_name or email should contain the search term
    const matchesName = memberName.includes(searchLower);
    const matchesEmail = memberEmail.includes(searchLower);
    TestValidator.predicate(
      `member matches search: ${membership.member.display_name}`,
      matchesName || matchesEmail,
    );
  }
  // 5. Validate membership record structure
  if (result.data.length > 0) {
    const firstMembership = result.data[0];
    typia.assert(firstMembership);
    // Validate required fields exist
    TestValidator.predicate(
      "membership has id",
      () => firstMembership.id !== undefined,
    );
    TestValidator.equals(
      "id format is uuid",
      /^[0-9a-f-]{36}$/i.test(firstMembership.id!),
      true,
    );
    typia.assert(firstMembership.member);
    TestValidator.predicate(
      "member has display_name",
      () => firstMembership.member.display_name !== undefined,
    );
    TestValidator.predicate(
      "member has email",
      () => firstMembership.member.email !== undefined,
    );
    TestValidator.predicate(
      "member has avatar_uri",
      () => firstMembership.member.avatar_uri !== undefined,
    );
    TestValidator.predicate(
      "member has phone_number",
      () => firstMembership.member.phone_number !== undefined,
    );
    typia.assert(firstMembership.organization);
    TestValidator.predicate(
      "organization has id",
      () => firstMembership.organization.id !== undefined,
    );
    TestValidator.predicate(
      "organization has name",
      () => firstMembership.organization.name !== undefined,
    );
    typia.assert(firstMembership.organizationRole);
    TestValidator.predicate(
      "role has id",
      () => firstMembership.organizationRole.id !== undefined,
    );
    TestValidator.predicate(
      "role has name",
      () => firstMembership.organizationRole.name !== undefined,
    );
    TestValidator.predicate(
      "role has is_builtin",
      () => firstMembership.organizationRole.is_builtin !== undefined,
    );
    // Validate timestamps
    TestValidator.predicate(
      "created_at format",
      () => firstMembership.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at format",
      () => firstMembership.updated_at !== undefined,
    );
    // Verify soft-deleted memberships are excluded (deleted_at should be null for active memberships)
    TestValidator.equals(
      "active membership has null deleted_at",
      firstMembership.deleted_at,
      null,
    );
  }
  // 6. Test filtering by role_id
  if (result.data.length > 0 && result.data[0].organizationRole.id) {
    const testRoleId = result.data[0].organizationRole.id;
    const roleFilteredResult =
      await api.functional.hrms.member.organization_members.index(
        authenticatedConnection,
        {
          body: {
            role_id: testRoleId,
          },
        },
      );
    typia.assert(roleFilteredResult);
    typia.assert(roleFilteredResult.data);
    // Verify all returned memberships have the specified role
    for (const membership of roleFilteredResult.data) {
      TestValidator.equals(
        `membership role matches filter`,
        membership.organizationRole.id,
        testRoleId,
      );
    }
  }
  // 7. Verify pagination metadata accuracy
  if (paginationResult.data.length > 0) {
    const totalPages = Math.ceil(
      paginationResult.pagination.records / paginationResult.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation",
      paginationResult.pagination.pages,
      totalPages,
    );
  }
}