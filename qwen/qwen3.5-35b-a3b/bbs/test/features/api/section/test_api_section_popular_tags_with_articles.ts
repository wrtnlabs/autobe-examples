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

export async function test_api_section_popular_tags_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest setup (as per scenario dependency)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a valid UUID for section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call popular tags endpoint (no auth required, but we have guest context)
  const summary: IEconomicPoliticalBoardSectionPopularTag.ISummary =
    await api.functional.economicPoliticalBoard.guest.sections.popular_tags.popularTags(
      guestConnection,
      {
        sectionId,
      },
    );
  // 4. Validate response structure
  typia.assert(summary);
  // 5. Validate tagName is a string
  TestValidator.predicate(
    "tagName is string",
    typeof summary.tagName === "string",
  );
  // 6. Validate articleCount is a valid int32 number
  TestValidator.predicate(
    "articleCount is number",
    typeof summary.articleCount === "number",
  );
  // 7. Validate articleCount satisfies int32 tag constraint
  typia.assert(summary.articleCount satisfies number & tags.Type<"int32">);
  // 8. Validate articleCount is positive (no zero count tags as per scenario)
  TestValidator.predicate("articleCount is positive", summary.articleCount > 0);
}
