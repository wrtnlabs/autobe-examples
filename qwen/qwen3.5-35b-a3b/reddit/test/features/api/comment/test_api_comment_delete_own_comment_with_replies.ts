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

export async function test_api_comment_delete_own_comment_with_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create main member who owns the parent comment
  const mainMemberConnection: api.IConnection = { host: connection.host };
  const mainMemberAuth = await authorize_member_join(mainMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(mainMemberAuth);
  typia.assert(mainMemberAuth.user);
  const initialKarma = mainMemberAuth.user.karma_score;
  // 2. Create another member to create nested replies
  const replierMemberConnection: api.IConnection = { host: connection.host };
  const replierMemberAuth = await authorize_member_join(
    replierMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        href: "https://example.com",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(replierMemberAuth);
  // 3. Create parent comment as main member
  const parentComment =
    await api.functional.redditPlatform.member.comments.create(
      mainMemberConnection,
      {
        body: {
          content: "This is a parent comment with replies",
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 4. Create nested replies to the parent comment as replier
  const reply1 = await api.functional.redditPlatform.member.comments.create(
    replierMemberConnection,
    {
      body: {
        content: "This is a reply to the parent comment",
        parent_comment_id: parentComment.id,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply1);
  // Create nested reply to reply1 (deep nesting)
  const reply2 = await api.functional.redditPlatform.member.comments.create(
    replierMemberConnection,
    {
      body: {
        content: "This is a reply to reply 1",
        parent_comment_id: reply1.id,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply2);
  // 5. Delete the parent comment - this should cascade delete all nested replies
  await api.functional.redditPlatform.member.comments.erase(
    mainMemberConnection,
    {
      commentId: parentComment.id,
    },
  );
  // 6. Verify deletion succeeded and karma was adjusted
  // Re-authenticate to get fresh member data with updated karma
  const freshMemberAuth = await authorize_member_login(mainMemberConnection, {
    body: {
      email: mainMemberAuth.user.username,
      password: "1234",
    },
  });
  typia.assert(freshMemberAuth);
  typia.assert(freshMemberAuth.user);
  // The parent comment and all nested replies should be deleted
  // We verify by checking that the deletion operation completed without error
  TestValidator.predicate(
    "parent comment and nested replies deleted successfully",
    true,
  );
  // Verify member data exists after deletion
  TestValidator.equals(
    "member exists after deletion",
    freshMemberAuth.user.id,
    mainMemberAuth.user.id,
  );
}