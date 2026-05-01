import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that listing email verifications for a non-existent member returns 404.
 *
 * Validates that when attempting to retrieve email verification tokens for a username that has never been registered on the platform, the endpoint correctly returns a 404 Not Found response. This distinguishes the case of a non-existent member from a member who simply has no verification tokens, which should return an empty page with 200.
 *
 * 1. Generate a random username that does not exist on the platform.
 * 2. Attempt to list email verification tokens for the non-existent member.
 * 3. Verify the endpoint returns 404 Not Found.
 */
export async function test_api_member_email_verifications_list_nonexistent_member_not_found(
  connection: api.IConnection,
): Promise<void> {
  const nonexistentUsername = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "nonexistent member email verifications returns 404",
    404,
    async () => {
      await api.functional.communityHub.members.email_verifications.index(
        connection,
        {
          username: nonexistentUsername,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityHubMemberEmailVerification.IRequest,
        },
      );
    },
  );
}
