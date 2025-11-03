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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsReport";

export async function test_api_reports_moderation_index_for_moderator(
  connection: api.IConnection,
) {
  // 1) Create a moderator communityMember (self-join)
  const moderatorEmail = `mod-${Date.now()}@example.test`;
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderator = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: "Passw0rd!",
      session_context: {
        href: "https://example.test/welcome",
        referrer: "https://example.test/",
        ip: null,
        session_ttl_seconds: 3600,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(moderator);

  // 2) Create a community (unique slug)
  const slug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
          post_approval_required: false,
          settings: {
            visibility: "public",
            require_post_approval: false,
            max_images_per_post: 5,
            allowed_image_mime_types: ["image/jpeg", "image/png"],
          } satisfies ICommunityBbsCommunity.ISettings.ICreate,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("created community slug matches", community.slug, slug);

  // 3) Create a text post in the community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: slug,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          post_type: "text",
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("post belongs to community", post.community.slug, slug);

  // 4) Create a report against the post (authenticated reporter)
  const report = await api.functional.communityBbs.reports.create(connection, {
    body: {
      target_type: "post",
      target_id: post.id,
      reason_code: "spam",
      explanation: "Automated test report for moderation listing",
    } satisfies ICommunityBbsReport.ICreate,
  });
  typia.assert(report);
  TestValidator.equals(
    "report targets created post",
    report.target_id,
    post.id,
  );

  // 5) As the moderator, call moderation reports index with filters
  const page =
    await api.functional.communityBbs.communityMember.moderation.reports.index(
      connection,
      {
        body: {
          status: "open",
          target_type: "post",
          limit: 25,
          // scope by community to reduce noise (server may accept community_slug instead of id)
          community_slug: slug,
        } satisfies ICommunityBbsReport.IRequest,
      },
    );
  typia.assert(page);

  // Validate pagination and that our created report is present
  TestValidator.predicate(
    "reports page has at least one record",
    page.pagination.records >= 1,
  );

  const found = page.data.find(
    (r) => r.target && (r.target as any).id === post.id,
  );
  TestValidator.predicate(
    "created report is present in moderator listing",
    found !== undefined && found !== null,
  );

  // If found, validate reporter summary presence for authenticated reporter
  if (found) {
    // typia.assert on found to ensure it matches ICommunityBbsReport.ISummary
    typia.assert(found);
    TestValidator.predicate(
      "report summary includes reporter when reporter authenticated",
      found.reporter !== null && found.reporter !== undefined,
    );

    // Ensure the reported target id matches the post id
    TestValidator.equals(
      "report target id equals post id",
      found.target.id,
      post.id,
    );
  }
}
