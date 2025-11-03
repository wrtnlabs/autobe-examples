import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_report_post_create_by_member(
  connection: api.IConnection,
) {
  // 1. Prepare isolated per-actor connections so join() may set Authorization on each
  const aliceConn: api.IConnection = { ...connection, headers: {} };
  const bobConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register Alice (post author)
  const aliceEmail = `alice.${Date.now()}@example.test`;
  const aliceUsername = `alice_${Date.now()}`;
  const aliceAuth = await api.functional.auth.communityMember.join(aliceConn, {
    body: {
      email: aliceEmail,
      username: aliceUsername,
      password: "Passw0rd!",
      session_context: {
        href: "https://example.test/",
        referrer: "https://example.test/referrer",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(aliceAuth);
  const alice = aliceAuth.member;
  typia.assert(alice);

  // 3. Register Bob (reporting member)
  const bobEmail = `bob.${Date.now()}@example.test`;
  const bobUsername = `bob_${Date.now()}`;
  const bobAuth = await api.functional.auth.communityMember.join(bobConn, {
    body: {
      email: bobEmail,
      username: bobUsername,
      password: "Passw0rd!",
      session_context: {
        href: "https://example.test/",
        referrer: "https://example.test/referrer",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(bobAuth);
  const bob = bobAuth.member;
  typia.assert(bob);

  // 4. Alice creates a new community with unique slug
  const uniqueSuffix = Date.now().toString();
  const communitySlug = `test-community-${uniqueSuffix}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      aliceConn,
      {
        body: {
          name: `Test Community ${uniqueSuffix}`,
          slug: communitySlug,
          description: "E2E test community for report creation",
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community slug matches", community.slug, communitySlug);

  // 5. Alice creates a post in the community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: communitySlug,
        body: {
          title: "E2E Test Post for Reporting",
          body: "This post will be reported by another member.",
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.slug,
    communitySlug,
  );

  // 6. Bob files a report against the post
  const reportBody = {
    target_type: "post",
    target_id: post.id,
    reason_code: "spam",
    explanation: "Automated spam test report",
  } satisfies ICommunityBbsReport.ICreate;

  const firstReport = await api.functional.communityBbs.reports.create(
    bobConn,
    {
      body: reportBody,
    },
  );
  typia.assert(firstReport);

  // Validate core report fields and attribution
  TestValidator.equals(
    "report target type is post",
    firstReport.target_type,
    "post",
  );
  TestValidator.equals(
    "report target id matches post id",
    firstReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "report reason code is spam",
    firstReport.reason_code,
    "spam",
  );
  TestValidator.equals(
    "report reporter id is bob",
    firstReport.reporter_id,
    bob.id,
  );
  TestValidator.predicate(
    "report has created_at",
    firstReport.created_at !== null && firstReport.created_at !== undefined,
  );

  // 7. Attempt duplicate submission and assert consistent behavior
  const secondReport = await api.functional.communityBbs.reports.create(
    bobConn,
    {
      body: reportBody,
    },
  );
  typia.assert(secondReport);

  // The system may either create a new report or return the same logical report id.
  // Validate that both reports reference the same target, reason, and reporter attribution.
  TestValidator.equals(
    "duplicate report target id matches",
    secondReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "duplicate report reason code matches",
    secondReport.reason_code,
    "spam",
  );
  TestValidator.equals(
    "duplicate report reporter id is bob",
    secondReport.reporter_id,
    bob.id,
  );

  // Validate that both responses contain id and created_at and that created_at is a timestamp-like string
  typia.assert(firstReport.created_at);
  typia.assert(secondReport.created_at);

  // Business-level check: ensure the target_type is correct and reporter attribution remains consistent
  TestValidator.equals(
    "first report target_type is post",
    firstReport.target_type,
    "post",
  );
  TestValidator.equals(
    "second report target_type is post",
    secondReport.target_type,
    "post",
  );
}
