import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name_taken(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member with "existingname" display_name
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      displayName: "existingname",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1Authorized);
  TestValidator.equals(
    "member1 display_name set correctly",
    member1Authorized.display_name,
    "existingname",
  );
  // 2. Create second member with "newname" display_name
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      displayName: "newname",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Authorized);
  TestValidator.equals(
    "member2 display_name set correctly",
    member2Authorized.display_name,
    "newname",
  );
  // 3. Attempt to update member2's display_name to "existingname" (already taken by member1)
  await TestValidator.error(
    "should reject duplicate display_name",
    async () => {
      await api.functional.redditPlatform.member.profile.update(
        member2Connection,
        {
          body: {
            display_name: "existingname",
          } satisfies IRedditPlatformMember.IUpdate,
        },
      );
    },
  );
  // 4. Verify member2's display_name remains "newname" after failed update attempt
  // Re-authenticate to ensure clean state and verify current profile
  const member2UpdateResponse =
    await api.functional.redditPlatform.member.profile.update(
      member2Connection,
      {
        body: {
          display_name: "newname",
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
  typia.assert(member2UpdateResponse);
  TestValidator.equals(
    "member2 display_name unchanged after duplicate attempt",
    member2UpdateResponse.display_name,
    "newname",
  );
  // 5. Verify member1's display_name is still "existingname"
  const member1UpdateResponse =
    await api.functional.redditPlatform.member.profile.update(
      member1Connection,
      {
        body: {
          display_name: "existingname",
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
  typia.assert(member1UpdateResponse);
  TestValidator.equals(
    "member1 display_name unchanged",
    member1UpdateResponse.display_name,
    "existingname",
  );
  // 6. Verify both members can still successfully update their own profiles
  TestValidator.equals(
    "member1 can update own profile",
    member1UpdateResponse.username,
    member1Authorized.username,
  );
  TestValidator.equals(
    "member2 can update own profile",
    member2UpdateResponse.username,
    member2Authorized.username,
  );
}
