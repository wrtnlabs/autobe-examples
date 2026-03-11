import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import type { IEconomicPoliticalBoardSectionPopularTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSectionPopularTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_section_popular_tags_multiple_tags_distribution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create guest user account
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  // 2. Get a valid section ID - use typia.random for UUID
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call popular tags endpoint - returns array of ISummary
  const popularTags =
    await api.functional.economicPoliticalBoard.guest.sections.popular_tags.popularTags(
      guestConnection,
      {
        sectionId,
      },
    );
  // 4. Validate response is an array and has correct structure
  typia.assert(popularTags);
  // 5. Verify tag structure
  if (Array.isArray(popularTags) && popularTags.length > 0) {
    // Test first tag structure
    const firstTag = popularTags[0];
    typia.assert(firstTag);
    // Verify tagName is string
    TestValidator.equals(
      "tagName is string",
      typeof firstTag.tagName,
      "string",
    );
    // Verify articleCount is int32
    TestValidator.predicate(
      "articleCount is valid",
      typeof firstTag.articleCount === "number",
    );
    // Verify sorting: articleCount should be descending
    if (popularTags.length > 1) {
      for (let i = 0; i < popularTags.length - 1; i++) {
        const current = popularTags[i].articleCount;
        const next = popularTags[i + 1].articleCount;
        // Current should be >= next (descending order)
        TestValidator.predicate(
          `tag at index ${i} (${current}) >= tag at index ${i + 1} (${next})`,
          current >= next,
        );
      }
    }
    // Verify all tags have non-negative article counts
    for (const tag of popularTags) {
      TestValidator.predicate(
        `articleCount for tag ${tag.tagName} is non-negative`,
        tag.articleCount >= 0,
      );
    }
  } else {
    // If empty array or not array, still validate structure
    TestValidator.equals("response is array", Array.isArray(popularTags), true);
  }
}