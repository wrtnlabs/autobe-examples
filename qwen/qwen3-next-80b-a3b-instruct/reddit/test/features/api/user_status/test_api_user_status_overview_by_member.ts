import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMemberSession";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import { prepare_random_community_bbs_member } from "../../../prepare/prepare_random_community_bbs_member";
import { generate_random_community_bbs_member_member_sessions_create } from "../../../generate/generate_random_community_bbs_member_member_sessions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_user_status_overview_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member-specific connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Join as a new member to create account
  const password = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Create a session to authenticate the member (using the same password from join)
  const session =
    await generate_random_community_bbs_member_member_sessions_create(
      memberConnection,
      {
        body: {
          email: member.email,
          password, // Use stored password variable instead of member.password
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityBbsMember.ICreate,
      },
    );
  typia.assert(session);
  // Step 4: Retrieve and validate the member's status overview
  const statusOverview =
    await api.functional.communityBbs.member.users.status_overview.at(
      memberConnection,
      {
        userId: member.id,
      },
    );
  typia.assert(statusOverview);
  // Step 5: Validate the status field matches the expected state for a new member ('active')
  TestValidator.equals(
    "status is active for new member",
    statusOverview.status,
    "active",
  );
  TestValidator.equals(
    "user_id matches member id",
    statusOverview.user_id,
    member.id,
  );
  TestValidator.equals(
    "actor_type is member for self-request",
    statusOverview.actor_type,
    "member",
  );
  TestValidator.equals(
    "performed_by matches member id",
    statusOverview.performed_by,
    member.id,
  );
  // Step 6: Test access control - unauthenticated user cannot access status overview
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot access status overview",
    async () => {
      await api.functional.communityBbs.member.users.status_overview.at(
        guestConnection,
        {
          userId: member.id,
        },
      );
    },
  );
}