import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_deleted_contents_retrieval_admin_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin signup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: "admin@example.com",
        password: "StrongPass1234",
        displayName: "AdminUser",
        bio: "Administrator account for E2E tests",
        avatarUrl: null,
      },
    });
  // Update adminConnection with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Attempt retrieval of deleted contents with default pagination (no filters)
  const reqBody: ICommunityPlatformDeletedContent.IRequest = {};
  const response: IPageICommunityPlatformDeletedContent.ISummary =
    await api.functional.communityPlatform.admin.deleted_contents.index(
      adminConnection,
      { body: reqBody },
    );
  // 3. Validate response schema
  typia.assert(response);
  // 4. Validate pagination object
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page number is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pagination.pages >= 0,
  );
  // 5. Validate integrity of deleted contents list
  for (const deletedContent of response.data) {
    typia.assert(deletedContent);
    TestValidator.predicate(
      "deletedContent has id",
      typeof deletedContent.id === "string" && deletedContent.id.length > 0,
    );
    TestValidator.predicate(
      "deletedContent has reason",
      typeof deletedContent.reason === "string" &&
        deletedContent.reason.length > 0,
    );
    TestValidator.predicate(
      "deletedContent has createdAt ISO string",
      typeof deletedContent.createdAt === "string" &&
        deletedContent.createdAt.length > 0,
    );
    TestValidator.predicate(
      "deletedContent has updatedAt ISO string",
      typeof deletedContent.updatedAt === "string" &&
        deletedContent.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "deletedContent moderatorId is UUID string",
      typeof deletedContent.moderatorId === "string" &&
        /^[0-9a-fA-F-]{36}$/.test(deletedContent.moderatorId),
    );
    TestValidator.predicate(
      "deletedContent userId is UUID string",
      typeof deletedContent.userId === "string" &&
        /^[0-9a-fA-F-]{36}$/.test(deletedContent.userId),
    );
    TestValidator.predicate(
      "deletedContent postId is either null or UUID string",
      deletedContent.postId === null ||
        (typeof deletedContent.postId === "string" &&
          /^[0-9a-fA-F-]{36}$/.test(deletedContent.postId)),
    );
    TestValidator.predicate(
      "deletedContent commentId is either null or UUID string",
      deletedContent.commentId === null ||
        (typeof deletedContent.commentId === "string" &&
          /^[0-9a-fA-F-]{36}$/.test(deletedContent.commentId)),
    );
    // Verify moderator and user summaries present
    typia.assert(deletedContent.moderator);
    typia.assert(deletedContent.user);
  }
  // 6. Validate unauthorized access is denied
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to deleted contents endpoint",
    401,
    async () => {
      await api.functional.communityPlatform.admin.deleted_contents.index(
        unauthorizedConnection,
        { body: reqBody },
      );
    },
  );
}
