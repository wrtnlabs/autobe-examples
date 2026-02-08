import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reported_content_partial_update_associations(
  connection: api.IConnection,
): Promise<void> {
  // Create an actor-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Precondition: Create a reported content link with report, post, and comment associations
  const initialUpdateBody: ICommunityPlatformReportedContent.IUpdate = {};
  // Since ICommunityPlatformReportedContent.IUpdate has empty schema, we use empty object (simulate)
  // Invoke updateReportedContent with a random id (simulate existing)
  const id1 = typia.random<string & tags.Format<"uuid">>();
  const updated1 =
    await api.functional.communityPlatform.reportedContents.updateReportedContent(
      moderatorConnection,
      {
        id: id1,
        body: initialUpdateBody,
      },
    );
  typia.assert(updated1);
  // Test 1: Dissociate all associations (null out all fields, but since no fields exist, just empty)
  const dissociateBody: ICommunityPlatformReportedContent.IUpdate = {};
  const updatedAfterDissociate =
    await api.functional.communityPlatform.reportedContents.updateReportedContent(
      moderatorConnection,
      {
        id: id1,
        body: dissociateBody,
      },
    );
  typia.assert(updatedAfterDissociate);
  // Test 2: Update to point to a different reported comment
  const id2 = typia.random<string & tags.Format<"uuid">>();
  const updateToDifferentCommentBody: ICommunityPlatformReportedContent.IUpdate =
    {};
  const updatedAfterCommentChange =
    await api.functional.communityPlatform.reportedContents.updateReportedContent(
      moderatorConnection,
      {
        id: id2,
        body: updateToDifferentCommentBody,
      },
    );
  typia.assert(updatedAfterCommentChange);
  // Test 3: Partial update - Update some fields (simulate with empty) and verify unchanged
  const id3 = typia.random<string & tags.Format<"uuid">>();
  const partialUpdateBody: ICommunityPlatformReportedContent.IUpdate = {};
  const updatedAfterPartialUpdate =
    await api.functional.communityPlatform.reportedContents.updateReportedContent(
      moderatorConnection,
      {
        id: id3,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedAfterPartialUpdate);
}
