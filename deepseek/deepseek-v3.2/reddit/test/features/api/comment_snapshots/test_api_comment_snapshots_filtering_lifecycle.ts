import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_snapshots_filtering_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // Note: The scenario requires creating comment lifecycle events (creation, edit, deletion)
  // to generate snapshots, but the provided SDK only has the snapshot retrieval endpoint.
  // Without APIs for member/community/post/comment creation, we cannot trigger snapshot
  // generation. Therefore, this test focuses on validating the snapshot filtering and
  // pagination functionality with existing data.
  // Create connection for the test (endpoint has null authorization)
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic pagination with default parameters
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;
  const basicResult =
    await api.functional.communityPlatform.comment_snapshots.index(
      testConnection,
      { body: basicRequest },
    );
  typia.assert(basicResult);
  // Validate pagination structure
  TestValidator.predicate("has valid pagination", () => {
    return (
      basicResult.pagination.current >= 1 &&
      basicResult.pagination.limit >= 1 &&
      basicResult.pagination.records >= 0 &&
      basicResult.pagination.pages >= 0
    );
  });
  // Test 2: Filter by various status values if data exists
  const statuses = ["creation", "edit", "deletion"] as const;
  for (const status of statuses) {
    const statusRequest = {
      ...basicRequest,
      status,
    } satisfies ICommunityPlatformCommentSnapshot.IRequest;
    const statusResult =
      await api.functional.communityPlatform.comment_snapshots.index(
        testConnection,
        { body: statusRequest },
      );
    typia.assert(statusResult);
    // Validate all returned snapshots have the requested status
    for (const snapshot of statusResult.data) {
      TestValidator.equals(
        "snapshot status matches filter",
        snapshot.status,
        status,
      );
    }
  }
  // Test 3: Date range filtering with recent dates
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRequest = {
    ...basicRequest,
    createdStart: oneMonthAgo.toISOString(),
    createdEnd: now.toISOString(),
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;
  const dateResult =
    await api.functional.communityPlatform.comment_snapshots.index(
      testConnection,
      { body: dateRequest },
    );
  typia.assert(dateResult);
  // Test 4: Body search with random substring
  const searchText = RandomGenerator.alphabets(5);
  const searchRequest = {
    ...basicRequest,
    bodySearch: searchText,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;
  const searchResult =
    await api.functional.communityPlatform.comment_snapshots.index(
      testConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // Test 5: Sort options
  const sortOptions = [
    "created_at",
    "-created_at",
    "comment_id",
    "-comment_id",
  ] as const;
  for (const sort of sortOptions) {
    const sortRequest = {
      ...basicRequest,
      sort,
    } satisfies ICommunityPlatformCommentSnapshot.IRequest;
    const sortResult =
      await api.functional.communityPlatform.comment_snapshots.index(
        testConnection,
        { body: sortRequest },
      );
    typia.assert(sortResult);
  }
  // Test 6: Filter by commentId if we have any snapshots
  if (basicResult.data.length > 0) {
    const firstSnapshot = basicResult.data[0];
    const commentIdRequest = {
      ...basicRequest,
      commentId: firstSnapshot.comment.id,
    } satisfies ICommunityPlatformCommentSnapshot.IRequest;
    const commentIdResult =
      await api.functional.communityPlatform.comment_snapshots.index(
        testConnection,
        { body: commentIdRequest },
      );
    typia.assert(commentIdResult);
    // Validate all returned snapshots are for the specified comment
    for (const snapshot of commentIdResult.data) {
      TestValidator.equals(
        "snapshot comment ID matches filter",
        snapshot.comment.id,
        firstSnapshot.comment.id,
      );
    }
  }
  // Test 7: Filter by editorMemberId if we have edit snapshots
  // Find an edit snapshot with an editor
  const editSnapshots = basicResult.data.filter(
    (snapshot) => snapshot.status === "edit" && snapshot.editor,
  );
  if (editSnapshots.length > 0) {
    const editSnapshot = editSnapshots[0];
    const editorIdRequest = {
      ...basicRequest,
      editorMemberId: editSnapshot.editor!.id,
    } satisfies ICommunityPlatformCommentSnapshot.IRequest;
    const editorIdResult =
      await api.functional.communityPlatform.comment_snapshots.index(
        testConnection,
        { body: editorIdRequest },
      );
    typia.assert(editorIdResult);
    // Validate editor information
    for (const snapshot of editorIdResult.data) {
      if (snapshot.editor) {
        TestValidator.equals(
          "editor member ID matches filter",
          snapshot.editor.id,
          editSnapshot.editor!.id,
        );
      }
    }
  }
  // Test 8: Validate snapshot structure
  for (const snapshot of basicResult.data) {
    // Validate required fields exist
    TestValidator.predicate("has snapshot ID", () => snapshot.id.length > 0);
    TestValidator.predicate("has status", () => snapshot.status.length > 0);
    TestValidator.predicate("has body", () => snapshot.body.length > 0);
    TestValidator.predicate(
      "has created_at",
      () => snapshot.created_at.length > 0,
    );
    // Validate comment reference structure
    TestValidator.predicate(
      "has comment reference",
      () => snapshot.comment.id.length > 0,
    );
    TestValidator.predicate(
      "comment has content",
      () => snapshot.comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment has author",
      () => snapshot.comment.author.id.length > 0,
    );
    TestValidator.predicate(
      "comment has post",
      () => snapshot.comment.post.id.length > 0,
    );
    // Validate editor can be null or ISummary
    if (snapshot.editor !== null && snapshot.editor !== undefined) {
      TestValidator.predicate(
        "editor has ID",
        () => snapshot.editor!.id.length > 0,
      );
      TestValidator.predicate(
        "editor has email",
        () => snapshot.editor!.email.length > 0,
      );
      TestValidator.predicate(
        "editor has username",
        () => snapshot.editor!.username.length > 0,
      );
    }
  }
}
