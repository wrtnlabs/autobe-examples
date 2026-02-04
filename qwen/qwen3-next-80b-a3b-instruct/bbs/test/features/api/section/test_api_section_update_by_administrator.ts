import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_section_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Create a section to update
  const createdSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {
        body: {} satisfies IEconomicDiscussionSection.ICreate, // Empty object per DTO definition
      },
    );
  typia.assert(createdSection);
  // Step 3: Update section - empty body since IUpdate is empty
  const updatedSection =
    await api.functional.economicDiscussion.administrator.sections.update(
      adminConnection,
      {
        sectionCode: createdSection.id, // Use section code (ID) to identify the section
        body: {} satisfies IEconomicDiscussionSection.IUpdate, // Empty object per DTO definition
      },
    );
  typia.assert(updatedSection);
  // Step 4: Validate updated section data
  // Only validation possible since section has only id property
  TestValidator.equals(
    "section id unchanged",
    updatedSection.id,
    createdSection.id,
  );
}
