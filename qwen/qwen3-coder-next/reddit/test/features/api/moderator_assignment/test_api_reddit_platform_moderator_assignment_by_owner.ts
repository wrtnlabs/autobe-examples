import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test scenario for a community owner assigning a moderator to their community.
 * 1. Register as community owner
 * 2. Register another user to be assigned as moderator
 * 3. Assign the moderator using updateModerator API
 * 4. Validate the assignment structure
 */
export async function test_api_reddit_platform_moderator_assignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = typia.random<IRedditPlatformMember.IJoin>();
  const owner = await authorize_member_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Register another user to be assigned as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = typia.random<IRedditPlatformMember.IJoin>();
  const moderator = await authorize_member_join(moderatorConnection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  // 3. Create a community assignment with MODERATOR role
  const assignment =
    await api.functional.redditPlatform.member.redditPlatform.moderations.updateModerator(
      ownerConnection,
      {
        body: {
          role: "MODERATOR" as const,
        } satisfies IRedditPlatformModeration.IUpdate,
      },
    );
  typia.assert(assignment);
  // 4. Validate the assignment
  TestValidator.equals("role is MODERATOR", assignment.role, "MODERATOR");
  TestValidator.predicate("has valid community info", () => {
    return (
      assignment.community !== null && typeof assignment.community === "object"
    );
  });
  TestValidator.predicate("has valid user info", () => {
    return assignment.user !== null && typeof assignment.user === "object";
  });
}
