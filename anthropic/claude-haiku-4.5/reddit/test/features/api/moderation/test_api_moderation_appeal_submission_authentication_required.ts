import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test that appeal submission requires proper authentication.
 *
 * This test validates authentication requirements for the moderation appeal
 * submission endpoint. It verifies that:
 *
 * 1. Unauthenticated requests return 401 Unauthorized
 * 2. Requests with invalid/malformed tokens return 401 Unauthorized
 * 3. Requests with missing Authorization headers return 401 Unauthorized
 * 4. Authenticated members can successfully submit appeals
 *
 * The test flow:
 *
 * 1. Register a member to obtain valid authentication tokens
 * 2. Create a valid moderation decision reference for the appeal
 * 3. Test unauthenticated appeal submission (should fail with 401)
 * 4. Test malformed authorization header (should fail with 401)
 * 5. Test missing authorization header (should fail with 401)
 * 6. Test successful authenticated appeal submission
 */
export async function test_api_moderation_appeal_submission_authentication_required(
  connection: api.IConnection,
) {
  // Step 1: Register a member and obtain authentication tokens
  const memberResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: "SecurePass123!",
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResponse);

  // Step 2: Generate a valid report decision ID for testing appeals
  const decisionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Test unauthenticated appeal submission (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "appeal submission without authentication should return 401",
    401,
    async () => {
      return await api.functional.communityPlatform.member.moderationAppeals.create(
        unauthenticatedConnection,
        {
          body: {
            community_platform_report_decision_id: decisionId,
            appeal_reason: RandomGenerator.paragraph({ sentences: 15 }),
            supporting_evidence: "http://example.com/evidence",
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Step 4: Test with malformed/invalid Authorization header
  const malformedAuthConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid_token_format",
    },
  };

  await TestValidator.httpError(
    "appeal submission with invalid token should return 401",
    401,
    async () => {
      return await api.functional.communityPlatform.member.moderationAppeals.create(
        malformedAuthConnection,
        {
          body: {
            community_platform_report_decision_id: decisionId,
            appeal_reason: RandomGenerator.paragraph({ sentences: 15 }),
            supporting_evidence: "http://example.com/evidence",
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Step 5: Test with completely missing Authorization header
  const noAuthHeaderConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  await TestValidator.httpError(
    "appeal submission without Authorization header should return 401",
    401,
    async () => {
      return await api.functional.communityPlatform.member.moderationAppeals.create(
        noAuthHeaderConnection,
        {
          body: {
            community_platform_report_decision_id: decisionId,
            appeal_reason: RandomGenerator.paragraph({ sentences: 15 }),
            supporting_evidence: "http://example.com/evidence",
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Step 6: Test successful authenticated appeal submission
  const appeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decisionId,
          appeal_reason: RandomGenerator.paragraph({ sentences: 15 }),
          supporting_evidence: "http://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Verify the appeal was created with correct status
  TestValidator.equals(
    "appeal initial status should be submitted",
    appeal.appeal_status,
    "submitted",
  );
}
