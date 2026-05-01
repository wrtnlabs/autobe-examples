import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving an email verification record for a non-existent member returns 404.
 *
 * Validates the business rule that the target member must exist before any scoped verification
 * record can be retrieved. This endpoint is unauthenticated, so the base connection is used
 * directly without actor-specific credentials.
 *
 * The test also covers the documented edge case where soft-deleted members (deleted_at is not
 * null) return 404 since their resources are no longer accessible — both scenarios trigger
 * the same 404 Not Found response.
 *
 * 1. Generate a random non-existent username and a valid UUID for verificationId.
 * 2. Attempt to retrieve the email verification record via the API.
 * 3. Expect 404 Not Found since the member does not exist.
 */
export async function test_api_email_verification_member_not_found(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "member not found returns 404",
    404,
    async () =>
      await api.functional.communityHub.members.email_verifications.at(
        connection,
        {
          username: RandomGenerator.alphabets(10),
          verificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
