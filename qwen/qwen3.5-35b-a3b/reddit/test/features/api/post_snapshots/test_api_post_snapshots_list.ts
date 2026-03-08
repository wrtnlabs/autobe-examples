import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshots_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination with minimal request body
  const output = await api.functional.redditPlatform.post_snapshots.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(output);
  // 2. Validate pagination metadata structure and accuracy
  const pagination = output.pagination;
  typia.assert(pagination);
  // Current page should be 1
  TestValidator.equals("pagination current page", pagination.current, 1);
  // Limit should match request (20)
  TestValidator.equals("pagination limit", pagination.limit, 20);
  // Records should be non-negative
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  // Pages should be non-negative
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // Pages calculation should be accurate
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pagination pages calculation",
    pagination.pages,
    expectedPages satisfies number as number,
  );
  // 3. Validate data array structure
  typia.assert(Array.isArray(output.data));
  const snapshots = output.data;
  // If snapshots exist, validate each record's structure
  if (snapshots.length > 0) {
    for (const snapshot of snapshots) {
      typia.assert(snapshot);
      // Validate id format (UUID)
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      TestValidator.predicate(
        "snapshot id is valid UUID",
        uuidPattern.test(snapshot.id),
      );
      // Validate title length (max 300 characters)
      TestValidator.predicate(
        "snapshot title within length limit",
        snapshot.title.length <= 300,
      );
      // Validate postType is valid enum value
      TestValidator.predicate(
        "postType is valid type",
        ["TEXT", "LINK", "IMAGE"].includes(snapshot.postType),
      );
      // Validate voteScore is int32
      TestValidator.predicate(
        "voteScore is valid int32",
        Number.isInteger(snapshot.voteScore) &&
          snapshot.voteScore >= -2147483648 &&
          snapshot.voteScore <= 2147483647,
      );
      // Validate commentCount is int32
      TestValidator.predicate(
        "commentCount is valid int32",
        Number.isInteger(snapshot.commentCount) &&
          snapshot.commentCount >= 0 &&
          snapshot.commentCount <= 2147483647,
      );
      // Validate snapshotType is valid enum value
      TestValidator.predicate(
        "snapshotType is valid type",
        ["CREATE", "EDIT", "DELETE"].includes(snapshot.snapshotType),
      );
      // Validate createdAt is ISO 8601 date-time format
      const dateTimePattern =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
      TestValidator.predicate(
        "createdAt is valid date-time format",
        dateTimePattern.test(snapshot.createdAt),
      );
      // Validate optional content field exists and is string or null
      if (snapshot.content !== undefined) {
        TestValidator.predicate(
          "content is valid string or null",
          typeof snapshot.content === "string" || snapshot.content === null,
        );
      }
      // Validate optional url field exists and is URI or null when present
      if (snapshot.url !== undefined) {
        TestValidator.predicate(
          "url is valid URI or null",
          typeof snapshot.url === "string" || snapshot.url === null,
        );
      }
      // Validate optional imageUrl field exists and is URI or null when present
      if (snapshot.imageUrl !== undefined) {
        TestValidator.predicate(
          "imageUrl is valid URI or null",
          typeof snapshot.imageUrl === "string" || snapshot.imageUrl === null,
        );
      }
      // Validate author structure (IRedditPlatformMember.ISummary)
      typia.assert(snapshot.author);
      const author = snapshot.author;
      TestValidator.equals(
        "author has id",
        typeof author.id === "string",
        true,
      );
      TestValidator.equals(
        "author has username",
        typeof author.username === "string",
        true,
      );
      TestValidator.equals(
        "author has displayName",
        typeof author.displayName === "string",
        true,
      );
      TestValidator.equals(
        "author has karmaScore",
        typeof author.karmaScore === "number",
        true,
      );
      TestValidator.equals(
        "author has createdAt",
        typeof author.createdAt === "string",
        true,
      );
      TestValidator.equals(
        "author has subscriptionCount",
        typeof author.subscriptionCount === "number",
        true,
      );
      // Validate author id is UUID
      TestValidator.predicate(
        "author id is valid UUID",
        uuidPattern.test(author.id),
      );
      // Validate post structure (IRedditPlatformPost.ISummary)
      typia.assert(snapshot.post);
      const post = snapshot.post;
      TestValidator.equals("post has id", typeof post.id === "string", true);
      TestValidator.equals(
        "post has title",
        typeof post.title === "string",
        true,
      );
      TestValidator.equals(
        "post has post_type",
        typeof post.post_type === "string",
        true,
      );
      TestValidator.equals(
        "post has vote_score",
        typeof post.vote_score === "number",
        true,
      );
      TestValidator.equals(
        "post has comment_count",
        typeof post.comment_count === "number",
        true,
      );
      TestValidator.equals(
        "post has author",
        typeof post.author === "object",
        true,
      );
      TestValidator.equals(
        "post has community",
        typeof post.community === "object",
        true,
      );
      TestValidator.equals(
        "post has created_at",
        typeof post.created_at === "string",
        true,
      );
      // Validate post id is UUID
      TestValidator.predicate(
        "post id is valid UUID",
        uuidPattern.test(post.id),
      );
    }
    // 4. Verify sorting order (created_at DESC - most recent first)
    if (snapshots.length >= 2) {
      for (let i = 1; i < snapshots.length; i++) {
        TestValidator.predicate(
          `snapshot ${i} is older than snapshot ${i - 1}`,
          new Date(snapshots[i].createdAt) <=
            new Date(snapshots[i - 1].createdAt),
        );
      }
    }
  } else {
    // 5. Validate empty data handling
    TestValidator.equals(
      "data array is empty when no snapshots",
      snapshots.length,
      0,
    );
    TestValidator.equals(
      "pagination records is 0 when no snapshots",
      pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination pages is 0 when no snapshots",
      pagination.pages,
      0,
    );
  }
}
