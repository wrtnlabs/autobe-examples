import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalUser";

export async function test_api_user_index_include_archived_admin(
  connection: api.IConnection,
) {
  // 1) Register a member account that will be archived
  const memberBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ssw0rd!${RandomGenerator.alphaNumeric(4)}`,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Soft-delete that member while authenticated as the member (SDK sets Authorization)
  await api.functional.communityPortal.member.users.erase(connection, {
    userId: member.id,
  });

  // 3) Register an admin account and obtain admin authorization
  const adminBody = {
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: `Adm1n!${RandomGenerator.alphaNumeric(4)}`,
    displayName: RandomGenerator.name(),
  } satisfies ICommunityPortalAdmin.ICreate;

  const admin: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 4) As admin, call the users index with includeArchived = true
  const page: IPageICommunityPortalUser.ISummary =
    await api.functional.communityPortal.users.index(connection, {
      body: {
        includeArchived: true,
      } satisfies ICommunityPortalUser.IRequest,
    });
  typia.assert(page);

  // 5) Validate that the archived user appears in the results
  const archived = page.data.find((u) => u.id === member.id);
  TestValidator.predicate(
    "archived user is included for admin when includeArchived is true",
    archived !== undefined,
  );

  if (archived) {
    typia.assert(archived);
    TestValidator.equals("archived user id matches", archived.id, member.id);
    TestValidator.predicate(
      "archived user has created_at",
      archived.created_at !== undefined && archived.created_at.length > 0,
    );
  }

  // Basic pagination sanity check
  TestValidator.predicate(
    "pagination present",
    page.pagination !== null && page.pagination !== undefined,
  );
}
