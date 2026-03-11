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

export async function test_api_section_guest_view_empty_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate a section ID (simulating a valid empty section)
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Guest views the section that has no articles
  const viewedSection: IEconomicPoliticalBoardSection =
    await api.functional.economicPoliticalBoard.guest.sections.at(
      guestConnection,
      {
        sectionId: sectionId,
      },
    );
  typia.assert(viewedSection);
  // 4. Validate section metadata fields are correct
  TestValidator.equals(
    "section id matches request",
    viewedSection.id,
    sectionId,
  );
  // 5. Confirm section name and description are present
  TestValidator.notEquals("section has name", viewedSection.name, null);
  // 6. Confirm articles array is empty [] rather than null or undefined
  TestValidator.equals(
    "articles array is empty array",
    viewedSection.articles,
    [],
  );
  // 7. Verify deleted_at is null (section not soft deleted)
  TestValidator.equals(
    "section is not soft deleted",
    viewedSection.deleted_at,
    null,
  );
  // 8. Verify timestamps exist and are valid date-time format
  const createdAt: string & tags.Format<"date-time"> = viewedSection.created_at;
  const updatedAt: string & tags.Format<"date-time"> = viewedSection.updated_at;
  TestValidator.notEquals("section has created_at timestamp", createdAt, null);
  TestValidator.notEquals("section has updated_at timestamp", updatedAt, null);
  // 9. Verify article count is 0 (articles array length)
  TestValidator.equals(
    "article count is zero",
    viewedSection.articles.length,
    0,
  );
}
