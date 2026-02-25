import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reported_contents_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of reported contents for moderators with valid filters and pagination.
  // 1. Create a moderator and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Test filtering by null contentType (both post and comment, no date filter, with pagination params)
  {
    const requestBody: ICommunityPlatformReportedContent.IRequest = {
      contentType: null,
      createdAfter: null,
      createdBefore: null,
      isDeleted: null,
      page: 1,
      limit: 5,
    };
    // Fetch reported contents
    const response =
      await api.functional.communityPlatform.moderator.reportedContents.index(
        moderatorConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page is 1",
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is 5",
      response.pagination.limit === 5,
    );
    TestValidator.predicate(
      "pagination pages is a non-negative number",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records is a non-negative number",
      response.pagination.records >= 0,
    );
    // Validate each reported content
    for (const item of response.data) {
      typia.assert(item);
      // report can be null or non-null
      if (item.report !== null) {
        typia.assert(item.report);
        TestValidator.predicate(
          "report id is uuid",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item.report.id,
          ),
        );
        // check report status is non-empty string
        TestValidator.predicate(
          "report status is non-empty string",
          typeof item.report.status === "string" &&
            item.report.status.length > 0,
        );
        // check reportReason presence
        TestValidator.predicate(
          "reportReason exists",
          item.report.reportReason !== null,
        );
        if (item.report.reportReason !== null) {
          typia.assert(item.report.reportReason);
        }
        // check user presence
        TestValidator.predicate("user exists", item.report.user !== null);
        if (item.report.user !== null) {
          typia.assert(item.report.user);
        }
        // reportedContents_count must be number >= 0
        TestValidator.predicate(
          "reportedContents_count is >= 0",
          typeof item.report.reportedContents_count === "number" &&
            item.report.reportedContents_count >= 0,
        );
        // timestamps
        const createdAt = new Date(item.report.created_at);
        const updatedAt = new Date(item.report.updated_at);
        TestValidator.predicate(
          "report created_at is valid date",
          !isNaN(createdAt.getTime()),
        );
        TestValidator.predicate(
          "report updated_at is valid date",
          !isNaN(updatedAt.getTime()),
        );
        // deleted_at can be null or valid date
        if (item.report.deleted_at !== null) {
          const deletedAt = new Date(item.report.deleted_at);
          TestValidator.predicate(
            "report deleted_at is valid date",
            !isNaN(deletedAt.getTime()),
          );
        }
      }
      // Validate reportedPost or reportedComment
      if (item.reportedPost !== null) {
        typia.assert(item.reportedPost);
        // id is uuid string
        TestValidator.predicate(
          "reportedPost id is uuid",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item.reportedPost.id,
          ),
        );
      }
      if (item.reportedComment !== null) {
        typia.assert(item.reportedComment);
        // id is uuid string
        TestValidator.predicate(
          "reportedComment id is uuid",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item.reportedComment.id,
          ),
        );
      }
    }
  }
  // 3. Test filtering only contentType "post"
  {
    const requestBody: ICommunityPlatformReportedContent.IRequest = {
      contentType: "post",
      createdAfter: null,
      createdBefore: null,
      isDeleted: null,
      page: 1,
      limit: 5,
    };
    const response =
      await api.functional.communityPlatform.moderator.reportedContents.index(
        moderatorConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // All data items must have reportedPost not null and reportedComment null
    for (const item of response.data) {
      typia.assert(item);
      TestValidator.predicate(
        "item has reportedPost",
        item.reportedPost !== null,
      );
      TestValidator.equals(
        "item reportedComment is null",
        item.reportedComment,
        null,
      );
    }
  }
  // 4. Test filtering only contentType "comment"
  {
    const requestBody: ICommunityPlatformReportedContent.IRequest = {
      contentType: "comment",
      createdAfter: null,
      createdBefore: null,
      isDeleted: null,
      page: 1,
      limit: 5,
    };
    const response =
      await api.functional.communityPlatform.moderator.reportedContents.index(
        moderatorConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // All data items must have reportedComment not null and reportedPost null
    for (const item of response.data) {
      typia.assert(item);
      TestValidator.predicate(
        "item has reportedComment",
        item.reportedComment !== null,
      );
      TestValidator.equals(
        "item reportedPost is null",
        item.reportedPost,
        null,
      );
    }
  }
  // 5. Test filtering by createdAfter and createdBefore
  {
    const createdAfter = new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 7,
    ).toISOString(); // 7 days ago
    const createdBefore = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 1,
    ).toISOString(); // 1 day ahead
    const requestBody: ICommunityPlatformReportedContent.IRequest = {
      contentType: null,
      createdAfter: createdAfter,
      createdBefore: createdBefore,
      isDeleted: null,
      page: 1,
      limit: 5,
    };
    const response =
      await api.functional.communityPlatform.moderator.reportedContents.index(
        moderatorConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Each report created_at should be after createdAfter and before createdBefore
    for (const item of response.data) {
      if (item.report !== null) {
        const createdAt = new Date(item.report.created_at);
        TestValidator.predicate(
          "report created_at is after createdAfter",
          createdAt >= new Date(createdAfter),
        );
        TestValidator.predicate(
          "report created_at is before createdBefore",
          createdAt <= new Date(createdBefore),
        );
      }
    }
  }
  // 6. Test unauthorized access fails
  {
    const noAuthConnection: api.IConnection = { host: connection.host };
    const requestBody: ICommunityPlatformReportedContent.IRequest = {
      contentType: null,
      createdAfter: null,
      createdBefore: null,
      isDeleted: null,
      page: 1,
      limit: 5,
    };
    await TestValidator.httpError("unauthorized access", 401, async () => {
      await api.functional.communityPlatform.moderator.reportedContents.index(
        noAuthConnection,
        { body: requestBody },
      );
    });
  }
}
