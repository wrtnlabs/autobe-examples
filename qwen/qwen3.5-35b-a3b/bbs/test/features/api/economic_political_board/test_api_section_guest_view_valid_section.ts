import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_section_guest_view_valid_section(
  connection: api.IConnection,
): Promise<void> {
  // Join as a guest user (required by scenario dependencies)
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
  // Generate a random section UUID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Call the sections.at endpoint
  const section = await api.functional.economicPoliticalBoard.guest.sections.at(
    guestConnection,
    { sectionId },
  );
  typia.assert(section);
  // Validate section response fields
  TestValidator.equals("section id format", section.id, sectionId);
  TestValidator.predicate(
    "section name is string",
    typeof section.name === "string",
  );
  TestValidator.predicate("section name not empty", section.name.length > 0);
  TestValidator.predicate(
    "section description is string or null",
    typeof section.description === "string" || section.description === null,
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      section.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      section.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null for active section",
    section.deleted_at,
    null,
  );
  // Validate articles array
  TestValidator.predicate("articles is array", Array.isArray(section.articles));
  if (section.articles.length > 0) {
    const article = section.articles[0];
    typia.assert(article);
    TestValidator.predicate("article id is string", typeof article.id === "string");
    TestValidator.predicate(
      "article title is string",
      typeof article.title === "string",
    );
    TestValidator.equals(
      "article author type",
      typeof article.author,
      "object",
    );
    TestValidator.predicate(
      "article author has id",
      article.author.id !== undefined,
    );
    TestValidator.predicate(
      "article comment count is number",
      typeof article.comment_count === "number",
    );
  }
}