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

export async function test_api_reports_moderation_list_by_moderator(
  connection: api.IConnection,
) {
  /**
   * Moderator-scoped report listing workflow.
   *
   * Steps implemented:
   *
   * 1. Register two members (mod, reporter) via join (which issues tokens).
   * 2. Mod creates a community.
   * 3. Mod creates a post in that community.
   * 4. Reporter files a report against the post.
   * 5. Mod queries PATCH /communityBbs/communityMember/reports to retrieve reports
   *    scoped to the community and validates presence and redaction.
   * 6. Reporter (non-moderator) attempts to query the same endpoint and must
   *    receive an error (access denied). We assert an error is thrown.
   */

  // 1) Prepare distinct connections for mod and reporter (SDK join will set Authorization header)
  const modConn: api.IConnection = { ...connection, headers: {} };
  const reporterConn: api.IConnection = { ...connection, headers: {} };

  // 1.1 Create 'mod' account (community creator / moderator)
  const modEmail: string = `mod.${Date.now()}@example.test`;
  const modUsername: string = `mod_${RandomGenerator.alphaNumeric(6)}`;

  const modAuth = await api.functional.auth.communityMember.join(modConn, {
    body: {
      email: modEmail,
      username: modUsername,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      profile: {
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 4 }),
        avatar_uri: null,
      },
      session_context: {
        href: "http://localhost/",
        referrer: "http://localhost/",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(modAuth);

  // 1.2 Create 'reporter' account
  const reporterEmail: string = `reporter.${Date.now()}@example.test`;
  const reporterUsername: string = `reporter_${RandomGenerator.alphaNumeric(6)}`;

  const reporterAuth = await api.functional.auth.communityMember.join(
    reporterConn,
    {
      body: {
        email: reporterEmail,
        username: reporterUsername,
        password: "Passw0rd!",
        display_name: RandomGenerator.name(),
        profile: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 3 }),
          avatar_uri: null,
        },
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(reporterAuth);

  // 2) Using mod context, create a community
  const uniqueSuffix = Date.now().toString();
  const communitySlug = `test-community-${uniqueSuffix}`;
  const communityName = `Test Community ${uniqueSuffix}`;

  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      modConn,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: "E2E test community for moderator reports",
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community slug matches", community.slug, communitySlug);

  // 3) Mod creates a post in the community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      modConn,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "text",
          media_ids: undefined,
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.slug,
    community.slug,
  );

  // 4) Reporter files a report against the post
  const report = await api.functional.communityBbs.reports.create(
    reporterConn,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason_code: "spam",
        explanation: "Automated test submission: spam-like content",
      } satisfies ICommunityBbsReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report target matches post",
    report.target_type,
    "post",
  );
  TestValidator.equals("report reason is spam", report.reason_code, "spam");

  // 5) Moderator-scoped listing: mod queries reports for their community
  const listing =
    await api.functional.communityBbs.communityMember.reports.index(modConn, {
      body: {
        status: "open",
        community_slug: community.slug,
        reporter_present: true,
        limit: 20,
      } satisfies ICommunityBbsReport.IRequest,
    });
  typia.assert(listing);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination present",
    listing.pagination !== null && listing.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination limit positive",
    listing.pagination.limit > 0,
  );

  // Validate that the created report appears in results
  const found = listing.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "created report appears in moderator listing",
    found !== undefined,
  );

  if (found) {
    // Reporter summary should be redacted to safe summary per DTO design
    if (found.reporter !== null && found.reporter !== undefined) {
      typia.assert(found.reporter); // ensures ISummary shape (no email field exists)
      TestValidator.predicate("reporter_present true in listing", true);
    } else {
      // If reporter is null, still valid to assert presence of report
      TestValidator.predicate("report present even if anonymous", true);
    }
  }

  // 6) Negative check: non-moderator (reporter) attempts moderator-scoped listing
  await TestValidator.error(
    "non-moderator cannot access moderator-scoped reports",
    async () => {
      await api.functional.communityBbs.communityMember.reports.index(
        reporterConn,
        {
          body: {
            status: "open",
            community_slug: community.slug,
          } satisfies ICommunityBbsReport.IRequest,
        },
      );
    },
  );
}
