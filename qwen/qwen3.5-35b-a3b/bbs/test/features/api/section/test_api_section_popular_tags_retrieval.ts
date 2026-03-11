import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSectionPopularTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSectionPopularTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_section_popular_tags_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Retrieve popular tags for a valid section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const popularTags = await api.functional.economicPoliticalBoard.member.sections.popular_tags.popularTags(
    memberConnection,
    { sectionId },
  );
  typia.assert<IEconomicPoliticalBoardSectionPopularTag.ISummary>(popularTags);
  // 3. Validate response has correct properties
  TestValidator.predicate("has tagName", popularTags.tagName.length > 0);
  TestValidator.predicate(
    "has valid articleCount",
    popularTags.articleCount >= 0,
  );
  TestValidator.predicate(
    "articleCount is safe integer",
    Number.isSafeInteger(popularTags.articleCount),
  );
}