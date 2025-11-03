import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentSnapshot";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommentSnapshot";

export async function test_api_comment_snapshot_history_author(
  connection: api.IConnection,
) {
  // 1. Register a new community member (author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const author = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: authorEmail,
      username: authorUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://localhost/test",
        referrer: "http://localhost/prev",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(author);

  // 2. Create a unique community
  const communitySlug = `test-community-${Date.now()}`;
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    communitySlug,
  );

  // 3. Create a text post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: communitySlug,
        body: {
          title: postTitle,
          body: postBody,
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches created community",
    post.community.id,
    community.id,
  );

  // 4. Create an initial comment on the post
  const initialCommentBody = RandomGenerator.paragraph({ sentences: 6 });
  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: initialCommentBody,
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment belongs to post",
    comment.community_bbs_post_id,
    post.id,
  );

  // 5. Update the comment to create an edit snapshot
  const editedBody = `${initialCommentBody} (edited) ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const updated: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.comments.update(
      connection,
      {
        commentId: comment.id,
        body: {
          body: editedBody,
          edit_summary: "typo fix and add detail",
        } satisfies ICommunityBbsComment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated comment id matches", updated.id, comment.id);

  // 6. Retrieve snapshot history as the comment author
  const history: IPageICommunityBbsCommentSnapshot.ISummary =
    await api.functional.communityBbs.communityMember.comments.history.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(history);

  // Business validations on snapshots and pagination
  TestValidator.predicate(
    "pagination object exists",
    history.pagination !== null && history.pagination !== undefined,
  );

  const snapshots = history.data;
  TestValidator.predicate(
    "at least two snapshots exist",
    snapshots.length >= 2,
  );

  // Ensure newest-first ordering (snapshot_at DESC)
  if (snapshots.length >= 2) {
    const first = snapshots[0];
    const second = snapshots[1];
    const firstTime = new Date(first.snapshot_at).getTime();
    const secondTime = new Date(second.snapshot_at).getTime();
    TestValidator.predicate(
      "snapshots ordered newest-first",
      firstTime >= secondTime,
    );

    // Most recent snapshot should reflect edited body (or include it)
    TestValidator.predicate(
      "most recent snapshot body includes edited content",
      typeof first.body === "string" && first.body.includes("edited"),
    );

    // Check snapshot properties exist (business expectations); typia.assert already ensured types
    TestValidator.predicate(
      "snapshot has score and upvotes/downvotes",
      typeof first.score === "number" &&
        typeof first.upvotes === "number" &&
        typeof first.downvotes === "number",
    );
  }

  // 7. Negative test: unauthorized (no headers) cannot fetch history
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized cannot fetch comment history",
    async () => {
      await api.functional.communityBbs.communityMember.comments.history.index(
        unauthConn,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
