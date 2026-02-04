import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator-specific connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  typia.assert(moderator);
  // Step 2: Generate a valid report ID
  const reportId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Call the dismiss endpoint with the report ID
  // This operation should return 204 No Content (void)
  await api.functional.communityPlatform.moderator.moderation.reports.dismiss(
    moderatorConnection,
    { reportId },
  );
  // Step 4: Validate the operation succeeded
  // Since we don't have a retrieval endpoint for reports in the provided SDK,
  // we can only verify that the dismiss operation completed without error
  // The return type is void, indicating success for 204 No Content
  // Step 5: For validation purposes, we can't verify the report status is 'dismissed'
  // or that resolved_at is set because we don't have a GET /reports/{reportId} endpoint
  // We rely on the system's behavior and the 204 response as confirmation of success
  // Since we have no way to verify the report state after dismissal (no retrieval endpoint),
  // we use TestValidator for a different validation: the operation completes successfully
  // We can't validate HTTP status codes directly, but since we get no error,
  // and the return type is void, it implies 204 No Content
  // Final validation: Operation completed without throwing an error
  // If the endpoint had issues, it would throw HttpError
  // The absence of an error is our validation
  // We don't have a way to validate that the report was removed from active queues
  // without a list endpoint
  // This test validates the core business requirement: a moderator can successfully dismiss a report
  // and the system accepts the request with 204 No Content
  // Since we're constrained by the API available endpoints, this is the best possible validation
  // that can be achieved in the current API contract
  // Note: In a real system with full API coverage, we would verify state changes
  // by calling GET /reports/{reportId} to check status and resolved_at
}
