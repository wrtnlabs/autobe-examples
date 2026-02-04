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
import type { ICommunityPlatformModeratorEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorEmailVerification";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator-specific connection and join to create account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Execute email verification with empty body as per ICommunityPlatformModeratorEmailVerification.IRequest spec
  // The token is handled via the authentication context established during join
  // Verification succeeds with empty body because the system tracks verification state internally
  // This matches the specification that IRequest is an empty object
  await api.functional.communityPlatform.moderator.auth.moderators.email.verify.complete(
    moderatorConnection,
    {
      body: {} satisfies ICommunityPlatformModeratorEmailVerification.IRequest,
    },
  );
  // The test is complete. This endpoint returns 204 No Content on success
  // The verification has been authenticated through the established session context
  // No additional validation is needed or possible per the provided DTOs
  // ISummary type is empty by design - we cannot access properties like id or email
  // The verification has succeeded by successful execution of the endpoint
}
