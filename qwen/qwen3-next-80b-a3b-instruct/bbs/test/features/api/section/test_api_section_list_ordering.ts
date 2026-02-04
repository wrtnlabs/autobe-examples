import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_list_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Retrieve all sections using the API
  const response: IPageIEconomicDiscussionSection.ISummary =
    await api.functional.economicDiscussion.sections.index(connection);
  typia.assert(response);
  // Step 2: Extract the section data for validation
  const sections = response.data;
  // Step 3: Validate that sections are ordered alphabetically by name
  // Check each adjacent pair of sections
  for (let i = 0; i < sections.length - 1; i++) {
    const currentSection = sections[i];
    const nextSection = sections[i + 1];
    // Verify that current section name <= next section name alphabetically
    TestValidator.predicate(
      `section '${currentSection.name}' comes before '${nextSection.name}' alphabetically`,
      currentSection.name.localeCompare(nextSection.name) <= 0,
    );
  }
}
