import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_reported_contents_create_reported_content } from "../../../generate/generate_random_community_platform_reported_contents_create_reported_content";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_reported_content } from "../../../prepare/prepare_random_community_platform_reported_content";

/**
 * Scenario 1: Successfully create a reported content record linked to a post.
 * Scenario 2: Successfully create a reported content record linked to a comment.
 * Scenario 3: Attempt report content creation with invalid report ID.
 */
export async function test_api_reported_content_create_linked_to_reported_post_or_comment(
  connection: api.IConnection,
): Promise<void> {
  // User join and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Scenario 1: Create a report and link to a post
  const reportForPost = await generate_random_community_platform_reports_create(
    userConnection,
    { body: {} },
  );
  typia.assert(reportForPost);
  // Link reported content to a valid post ID
  const reportedContentPost =
    await generate_random_community_platform_reported_contents_create_reported_content(
      userConnection,
      {
        body: {
          community_platform_report_id: typia.assert<string & tags.Format<"uuid">>(reportForPost as unknown as string & tags.Format<"uuid">),
          community_platform_reported_post_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_platform_reported_comment_id: null,
        },
      },
    );
  typia.assert(reportedContentPost);
  // Duplicate reported content creation for the same post-report pair
  await TestValidator.error(
    "Duplicate reported content link for post report should error",
    async () => {
      await generate_random_community_platform_reported_contents_create_reported_content(
        userConnection,
        {
          body: {
            community_platform_report_id: typia.assert<string & tags.Format<"uuid">>(reportForPost as unknown as string & tags.Format<"uuid">),
            community_platform_reported_post_id:
              typia.random<string & tags.Format<"uuid">>(),
            community_platform_reported_comment_id: null,
          },
        },
      );
    },
  );
  // Scenario 2: Create a report and link to a comment
  const reportForComment =
    await generate_random_community_platform_reports_create(userConnection, {
      body: {},
    });
  typia.assert(reportForComment);
  // Link reported content to a valid comment ID
  const reportedContentComment =
    await generate_random_community_platform_reported_contents_create_reported_content(
      userConnection,
      {
        body: {
          community_platform_report_id: typia.assert<string & tags.Format<"uuid">>(reportForComment as unknown as string & tags.Format<"uuid">),
          community_platform_reported_post_id: null,
          community_platform_reported_comment_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(reportedContentComment);
  // Duplicate reported content creation for the same comment-report pair
  await TestValidator.error(
    "Duplicate reported content link for comment report should error",
    async () => {
      await generate_random_community_platform_reported_contents_create_reported_content(
        userConnection,
        {
          body: {
            community_platform_report_id: typia.assert<string & tags.Format<"uuid">>(reportForComment as unknown as string & tags.Format<"uuid">),
            community_platform_reported_post_id: null,
            community_platform_reported_comment_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
  // Scenario 3: Attempt report content creation with invalid report ID
  const invalidReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Creating reported content with invalid report ID should error",
    async () => {
      await generate_random_community_platform_reported_contents_create_reported_content(
        userConnection,
        {
          body: {
            community_platform_report_id: invalidReportId,
            community_platform_reported_post_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            community_platform_reported_comment_id: null,
          },
        },
      );
    },
  );
}
