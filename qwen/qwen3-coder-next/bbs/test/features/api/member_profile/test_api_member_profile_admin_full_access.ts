import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_member_profile_admin_full_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminMember);
  // 2. Admin retrieves own profile
  const selfProfile = await api.functional.discussionBoard.members.at(
    adminConnection,
    {
      memberId: adminMember.id,
    },
  );
  typia.assert(selfProfile);
  TestValidator.equals(
    "admin can view own profile",
    selfProfile.id,
    adminMember.id,
  );
  TestValidator.predicate(
    "profile has required fields",
    selfProfile.isActive &&
      selfProfile.isAdmin &&
      selfProfile.isSuperAdmin !== undefined,
  );
  // 3. Admin retrieves another member's profile
  const randomMemberId = typia.random<string & tags.Format<"uuid">>();
  const memberProfile = await api.functional.discussionBoard.members.at(
    adminConnection,
    {
      memberId: randomMemberId,
    },
  );
  typia.assert(memberProfile);
  void TestValidator.predicate(
    "member profile has basic info",
    () => !!memberProfile.id && !!memberProfile.email && !!memberProfile.displayName,
  );
}