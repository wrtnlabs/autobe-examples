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

export async function test_api_section_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a test section
  const createdSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(createdSection);
  // Step 3: Delete the section
  await api.functional.economicDiscussion.administrator.sections.erase(
    adminConnection,
    { sectionId: createdSection.id },
  );
  // Step 4: Verify section deletion is irreversible
  await TestValidator.error("section deletion is permanent", async () => {
    await api.functional.economicDiscussion.administrator.sections.erase(
      adminConnection,
      { sectionId: createdSection.id },
    );
  });
  // Step 5: Confirm deletion is only allowed for administrators
  // Create a new connection with unauthenticated state to verify unauthorized access
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized users cannot delete sections",
    async () => {
      await api.functional.economicDiscussion.administrator.sections.erase(
        guestConnection,
        { sectionId: createdSection.id },
      );
    },
  );
}
