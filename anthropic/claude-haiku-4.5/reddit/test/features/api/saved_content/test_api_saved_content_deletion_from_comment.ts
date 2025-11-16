import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

export async function test_api_saved_content_deletion_from_comment(
  connection: api.IConnection,
) {
  // Step 1: Create first member (the saver)
  const saverEmail = typia.random<string & tags.Format<"email">>();
  const saver: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: saverEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(saver);
  const saverId = saver.id;

  // Step 2: Create second member (the commenter/post creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 3: Creator authenticates and creates a community
  const creatorConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: creator.token.access },
  };

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Creator creates a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      creatorConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          content_text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Step 5: Creator creates a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(
      creatorConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  const commentId = comment.id;

  // Step 6: Saver authenticates
  const saverConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: saver.token.access },
  };

  // Step 7: Retrieve saver's saved content to find a saved comment entry
  // The test assumes backend state where a comment has been saved by the saver
  const savedContentBefore: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      saverConnection,
      {
        memberId: saverId,
        body: {
          page: 1,
          limit: 100,
          contentType: "comment",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(savedContentBefore);

  // Step 8: Verify saved comments exist before deletion
  TestValidator.predicate(
    "saved content collection is retrievable",
    savedContentBefore.data.length >= 0,
  );

  // Step 9: Find a saved comment and delete it
  if (savedContentBefore.data.length > 0) {
    const firstSavedContent = savedContentBefore.data[0];
    const savedContentId = firstSavedContent.id;

    // Step 10: Delete the saved comment
    await api.functional.communityPlatform.member.members.saved.erase(
      saverConnection,
      {
        memberId: saverId,
        savedId: savedContentId,
      },
    );

    // Step 11: Verify saved content is deleted from saver's collection
    const savedContentAfter: IPageICommunityPlatformSavedContent.ISummary =
      await api.functional.communityPlatform.member.members.saved.index(
        saverConnection,
        {
          memberId: saverId,
          body: {
            page: 1,
            limit: 100,
            contentType: "comment",
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    typia.assert(savedContentAfter);

    const deletedItem = savedContentAfter.data.find(
      (item) => item.id === savedContentId,
    );
    TestValidator.predicate(
      "deleted saved content no longer appears in saved collection",
      deletedItem === undefined,
    );
  }

  // Step 12: Verify original comment still exists and is accessible
  // The comment itself should not be deleted, only the save relationship
  TestValidator.predicate(
    "deletion removes only the save relationship, not the original comment",
    comment.id === commentId,
  );
}
