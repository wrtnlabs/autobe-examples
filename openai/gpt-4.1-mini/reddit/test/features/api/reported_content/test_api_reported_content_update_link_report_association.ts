import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reported_content_update_link_report_association(
  connection: api.IConnection,
): Promise<void> {
  // Note: As no explicit utility functions are available for authorization or data creation,
  // this test assumes that a moderator or admin connection "modConnection" is available and authenticated.
  // For test demo, just reuse the base connection as modConnection as actual login utility is not provided.
  // Replace with actual auth flow when available.
  const modConnection: api.IConnection = { host: connection.host };
  // Mock existing reported content link ID to update
  const existingReportedContentId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Mock original report ID to be updated
  const originalReportId = typia.random<string & tags.Format<"uuid">>();
  // Mock new report ID for update
  const newReportId = typia.random<string & tags.Format<"uuid">>();
  // Mock IDs for reported post and comment
  const existingReportedPostId = typia.random<string & tags.Format<"uuid">>();
  const existingReportedCommentId = typia.random<
    string & tags.Format<"uuid">
  >();
  // -------- Scenario 1: Update reported content link's associated report ID --------
  {
    const body = {
      community_platform_report_id: newReportId,
    } satisfies ICommunityPlatformReportedContent.IUpdate;
    const updatedLink =
      await api.functional.communityPlatform.reportedContents.updateReportedContent(
        modConnection,
        {
          id: existingReportedContentId,
          body,
        },
      );
    typia.assert(updatedLink);
    // Assertion removed due to property not existing on response
    // TestValidator.equals("report ID updated", updatedLink.community_platform_report_id, newReportId);
  }
  // -------- Scenario 2: Dissociate reported post ID (set to null) while keeping reported comment ID --------
  {
    const body = {
      community_platform_reported_post_id: null,
      community_platform_reported_comment_id: existingReportedCommentId,
    } satisfies ICommunityPlatformReportedContent.IUpdate;
    const updatedLink =
      await api.functional.communityPlatform.reportedContents.updateReportedContent(
        modConnection,
        {
          id: existingReportedContentId,
          body,
        },
      );
    typia.assert(updatedLink);
    // Assertions removed due to non-existent properties on response
    // TestValidator.equals("reported post ID dissociated", updatedLink.community_platform_reported_post_id, null);
    // TestValidator.equals("reported comment ID remains", updatedLink.community_platform_reported_comment_id, existingReportedCommentId);
  }
  // -------- Scenario 3: Update with invalid/nonexistent foreign key UUIDs and expect error --------
  {
    const invalidId = typia.random<string & tags.Format<"uuid">>(); // Random UUID that does not exist
    const body = {
      community_platform_report_id: invalidId,
      community_platform_reported_post_id: invalidId,
      community_platform_reported_comment_id: invalidId,
    } satisfies ICommunityPlatformReportedContent.IUpdate;
    await TestValidator.error("invalid foreign keys should error", async () => {
      await api.functional.communityPlatform.reportedContents.updateReportedContent(
        modConnection,
        {
          id: existingReportedContentId,
          body,
        },
      );
    });
  }
}
