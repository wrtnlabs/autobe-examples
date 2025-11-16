import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentPolicyCategory";

/**
 * Validate that text search on content policy categories correctly filters by
 * code, name, and description for platform admin.
 *
 * Business context: Platform administrators manage a global taxonomy of content
 * policy categories (e.g., harassment, hate speech, spam). The PATCH
 * /communityPlatform/platformAdmin/contentPolicyCategories endpoint supports a
 * `search` field that should perform a case-insensitive text search across
 * code, name, and description. Admin consoles depend on this behavior to allow
 * quick lookup of categories by partial terms.
 *
 * Test steps:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join to obtain
 *    an authenticated session.
 * 2. As that admin, create three deterministic content policy categories using
 *    POST /communityPlatform/platformAdmin/contentPolicyCategories:
 *
 *    - Category A: code "harassment", name "Harassment and Bullying", description
 *         mentioning "harassment".
 *    - Category B: code "hate_speech", name "Hate Speech", description mentioning
 *         "hate".
 *    - Category C: code "spam", name "Spam and Scams", description mentioning
 *         "spam".
 * 3. Invoke PATCH /communityPlatform/platformAdmin/contentPolicyCategories with a
 *    body where `search` is set to a term that should match only a subset of
 *    these categories (e.g., "harass" should match only Category A; "Hate"
 *    should match only Category B; "spam" should match only Category C).
 * 4. For each search term, validate that:
 *
 *    - Response structure conforms to
 *         IPageICommunityPlatformContentPolicyCategory.ISummary using
 *         typia.assert.
 *    - Every returned summary in `data` has code, name, or description containing
 *         the term (case-insensitive).
 *    - Summaries for categories that do not contain the term are not present in the
 *         result set.
 * 5. Additionally, test a search term that appears only in the description of one
 *    category to ensure the description is part of the searchable fields.
 */
export async function test_api_content_policy_category_search_with_text_filter(
  connection: api.IConnection,
) {
  // 1. Register a platform admin via join
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create deterministic content policy categories
  const categoryHarassment =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: "harassment",
          name: "Harassment and Bullying",
          description:
            "Policies covering harassment, bullying, and targeted harassment behaviors.",
          isActive: true,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(categoryHarassment);

  const categoryHate =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: "hate_speech",
          name: "Hate Speech",
          description:
            "Policies covering hate, hateful expressions, and dehumanizing content.",
          isActive: true,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(categoryHate);

  const categorySpam =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: "spam",
          name: "Spam and Scams",
          description:
            "Policies covering spam, scams, and misleading commercial content.",
          isActive: true,
          isDefault: false,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(categorySpam);

  const created = [categoryHarassment, categoryHate, categorySpam];

  // Helper to perform a search and validate results
  const searchAndValidate = async (term: string, expectedCodes: string[]) => {
    const response =
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
        connection,
        {
          body: {
            search: term,
            // Limit high enough to get all matching categories
            limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          } satisfies ICommunityPlatformContentPolicyCategory.IRequest,
        },
      );
    typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(
      response,
    );

    const summaries = response.data;

    // All returned items must contain the term in code, name, or description
    const lowerTerm = term.toLowerCase();
    for (const summary of summaries) {
      const haystack =
        `${summary.code} ${summary.name} ${summary.description}`.toLowerCase();
      TestValidator.predicate(
        `all results contain term '${term}' in code/name/description`,
        haystack.includes(lowerTerm),
      );
    }

    // Expected codes must be present
    for (const code of expectedCodes) {
      const found = summaries.some((s) => s.code === code);
      TestValidator.predicate(
        `expected category code '${code}' is included for term '${term}'`,
        found,
      );
    }

    // Any created category not expected must not appear
    const unexpectedCodes = created
      .map((c) => c.code)
      .filter((code) => !expectedCodes.includes(code));

    for (const unexpected of unexpectedCodes) {
      const found = summaries.some((s) => s.code === unexpected);
      TestValidator.predicate(
        `unexpected category code '${unexpected}' is excluded for term '${term}'`,
        !found,
      );
    }
  };

  // 3-4. Run search scenarios for code/name matches
  await searchAndValidate("harass", ["harassment"]);
  await searchAndValidate("Hate", ["hate_speech"]);
  await searchAndValidate("spam", ["spam"]);

  // 5. Additional test: term that appears only in a description
  const uniqueDescriptionTerm = "uniquely_descriptive_phrase";
  const categoryWithUniqueDesc =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: "unique_description_category",
          name: "Unique Description Category",
          description: `Description that includes a ${uniqueDescriptionTerm} for testing.`,
          isActive: true,
          isDefault: false,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(categoryWithUniqueDesc);

  created.push(categoryWithUniqueDesc);

  await searchAndValidate(uniqueDescriptionTerm, [
    "unique_description_category",
  ]);
}
