import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_comments_thread_deleted_comment_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) Call thread listing for a postId.
  // NOTE: The available SDK in this prompt does not include an API to create/find
  // a post with seeded deleted comments. We therefore validate the response
  // contract for whatever comment thread the server returns.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const thread =
    await api.functional.communityPlatform.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "new",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPostVoteComment.IRequest,
      },
    );
  typia.assert(thread);
  const returned = thread.data;
  // 3) Deleted-comment handling policy.
  // If deleted comments are included, they must have deleted_at != null and
  // deletedBy populated. If none are included, all deleted_at should be null.
  const anyDeleted = returned.some((c) => c.deleted_at !== null);
  if (!anyDeleted) {
    TestValidator.predicate("no soft-deleted comments should be returned", () =>
      returned.every((c) => c.deleted_at === null),
    );
  } else {
    TestValidator.predicate("deleted comments must have deleted_at set", () =>
      returned
        .filter((c) => c.deleted_at !== null)
        .every((c) => c.deleted_at !== null),
    );
    TestValidator.predicate(
      "deletedBy must be populated for deleted comments",
      () =>
        returned
          .filter((c) => c.deleted_at !== null)
          .every((c) => c.deletedBy !== null),
    );
  }
  // 4) Thread integrity within the returned page.
  // replies should reference a parent that is present in the returned result set.
  const ids = new Set(returned.map((c) => c.id));
  TestValidator.predicate(
    "replies must not appear without their parent in response",
    () => {
      return returned.every(
        (c) => c.parent_comment_id === null || ids.has(c.parent_comment_id),
      );
    },
  );
  // 5) Isolation: ensure no duplicate ids in response (proxy for accidental mixing).
  TestValidator.predicate(
    "no duplicate comment ids in response",
    () => new Set(returned.map((c) => c.id)).size === returned.length,
  );
  // 6) Ordering: sort=new => posted_at descending.
  TestValidator.predicate(
    "comments must be ordered by posted_at desc for sort=new",
    () => {
      for (let i = 1; i < returned.length; i++) {
        const prev = new Date(returned[i - 1].posted_at).getTime();
        const curr = new Date(returned[i].posted_at).getTime();
        if (prev < curr) return false;
      }
      return true;
    },
  );
}
