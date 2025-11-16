import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test updating a report's reporter contact information.
 *
 * A moderator may receive additional contact information from the reporter and
 * should be able to update the reporter_contact_email field to ensure decision
 * notifications reach the reporter. Verify that email field updates are
 * properly recorded and formatted as valid email addresses. This scenario
 * validates that moderators can maintain accurate reporter contact information
 * for notification workflows.
 *
 * Test steps:
 *
 * 1. Create administrator account for moderation
 * 2. Create category for community organization
 * 3. Create member account as community creator
 * 4. Create community for discussion
 * 5. Create post in community
 * 6. Create member account as reporter
 * 7. Submit report on post without initial contact email
 * 8. Switch to administrator context
 * 9. Update report with valid reporter contact email
 * 10. Verify email was properly saved
 * 11. Update email to different address
 * 12. Verify new email is recorded correctly
 */
export async function test_api_report_update_reporter_contact_email(
  connection: api.IConnection,
) {
  // 1. Create administrator account for moderation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for community creator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "CreatorPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create member account as reporter
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphabets(8),
        password: "ReporterPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // 7. Submit report on post without initial contact email
  const initialReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(initialReport);
  TestValidator.equals(
    "initial report should not have contact email",
    initialReport.reporter_contact_email,
    null,
  );

  // 8. Switch to administrator context for moderation operations
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 9. Update report with valid reporter contact email
  const contactEmail = typia.random<string & tags.Format<"email">>();
  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.update(
      connection,
      {
        reportId: initialReport.id,
        body: {
          reporter_contact_email: contactEmail,
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  TestValidator.equals(
    "updated report should have contact email",
    updatedReport.reporter_contact_email,
    contactEmail,
  );

  // 10. Update email to different address
  const newContactEmail = typia.random<string & tags.Format<"email">>();
  const finalReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.update(
      connection,
      {
        reportId: updatedReport.id,
        body: {
          reporter_contact_email: newContactEmail,
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(finalReport);
  TestValidator.equals(
    "final report should have new contact email",
    finalReport.reporter_contact_email,
    newContactEmail,
  );
  TestValidator.notEquals(
    "new email should differ from previous",
    finalReport.reporter_contact_email,
    contactEmail,
  );
}
