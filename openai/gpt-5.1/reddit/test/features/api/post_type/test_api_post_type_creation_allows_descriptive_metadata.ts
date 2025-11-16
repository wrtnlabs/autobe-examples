import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that post type creation supports richly descriptive metadata.
 *
 * Business goal: Platform administrators must be able to register post types
 * whose `description` contains long-form, multi-paragraph configuration
 * documentation (field semantics, validation rules, UI hints). This test
 * ensures the /communityPlatform/platformAdmin/postTypes creation endpoint:
 *
 * - Accepts long, structured text in
 *   ICommunityPlatformPostType.ICreate.description
 * - Persists the description verbatim without truncation or normalization that
 *   would lose information
 * - Correctly round-trips `code`, `name`, and `description` for created types
 *   under an authenticated platformAdmin session.
 *
 * Scenario outline:
 *
 * 1. Register and authenticate a platformAdmin via POST /auth/platformAdmin/join
 *    using ICommunityPlatformPlatformadmin.IJoin so that subsequent calls carry
 *    platformAdmin authorization.
 * 2. Create a post type with a richly descriptive, multi-paragraph description
 *    documenting expected behavior.
 * 3. Verify that the response ICommunityPlatformPostType echoes back the exact
 *    `description`, with `code` and `name` matching input.
 * 4. Optionally create a second post type with an even longer description to guard
 *    against any hidden length thresholds.
 */
export async function test_api_post_type_creation_allows_descriptive_metadata(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(12)}`,
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // Optional ip omitted, href and referrer must be valid URIs.
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Build a richly descriptive, multi-paragraph description string.
  const descriptionPart1 =
    "Longform article post type used for in-depth editorial content. " +
    "Authors are expected to provide a structured title, rich body text, and " +
    "optional media attachments. This configuration is intended for blog-like " +
    "posts and long essays.";

  const descriptionPart2 =
    "\n\nField semantics:\n" +
    "- title: required, 10-120 characters, displayed as H1 in the UI.\n" +
    "- body: required, markdown or HTML, rendered in the main content area.\n" +
    "- summary: optional, used for preview cards and search snippets.\n" +
    "- coverImageUrl: optional, shown in listings and social previews.";

  const descriptionPart3 =
    "\n\nUI rendering guidelines:\n" +
    "- Use a two-column layout on desktop with a sticky table of contents.\n" +
    "- Collapse long code blocks by default with expand affordances.\n" +
    "- Highlight quoted sections and callouts using the theme's accent color.";

  const descriptionPart4 =
    "\n\nValidation rules and moderation notes:\n" +
    "- Posts must not include personal data in raw logs or stack traces.\n" +
    "- Automated filters scan for disallowed terms before publishing.\n" +
    "- Edits are tracked; moderators can view full edit history for disputes.";

  const longDescription =
    descriptionPart1 + descriptionPart2 + descriptionPart3 + descriptionPart4;

  const uniqueCode1 = `longform_${RandomGenerator.alphaNumeric(10)}`;
  const name1 = "Longform Article";

  const createBody1 = {
    code: uniqueCode1,
    name: name1,
    description: longDescription,
  } satisfies ICommunityPlatformPostType.ICreate;

  // 3. Create the post type and verify round-trip of metadata.
  const created1 =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createBody1,
      },
    );
  typia.assert<ICommunityPlatformPostType>(created1);

  TestValidator.equals(
    "created post type code should match input",
    created1.code,
    uniqueCode1,
  );
  TestValidator.equals(
    "created post type name should match input",
    created1.name,
    name1,
  );
  TestValidator.equals(
    "created post type description should match long-form input exactly",
    created1.description,
    longDescription,
  );

  // 4. Create a second post type with an even longer, auto-generated description
  //    to guard against hidden length limits.
  const autoDescription = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 12,
    sentenceMax: 24,
    wordMin: 4,
    wordMax: 10,
  });

  const uniqueCode2 = `longform_${RandomGenerator.alphaNumeric(10)}`;
  const name2 = "Extended Longform Article";

  const createBody2 = {
    code: uniqueCode2,
    name: name2,
    description: autoDescription,
  } satisfies ICommunityPlatformPostType.ICreate;

  const created2 =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createBody2,
      },
    );
  typia.assert<ICommunityPlatformPostType>(created2);

  TestValidator.equals(
    "second post type code should match its input",
    created2.code,
    uniqueCode2,
  );
  TestValidator.equals(
    "second post type name should match its input",
    created2.name,
    name2,
  );
  TestValidator.equals(
    "second post type description should match auto-generated long content",
    created2.description,
    autoDescription,
  );
}
