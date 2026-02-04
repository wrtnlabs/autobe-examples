import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
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
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_section_update_by_citizen_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an administrator account to establish a valid administrator role
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://referrer.com",
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const admin: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminCredentials,
    });
  typia.assert(admin);
  // Step 2: Create a section as administrator to have a target for update
  const section: IEconomicDiscussionSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // Step 3: Create a citizen account to test unauthorized update
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://referrer.com",
  } satisfies IEconomicDiscussionCitizen.IJoin;
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: citizenCredentials,
    });
  typia.assert(citizen);
  // Step 4: Try to update the section as citizen - this should fail with 403 Forbidden
  await TestValidator.error("citizen cannot update section", async () => {
    await api.functional.economicDiscussion.administrator.sections.update(
      citizenConnection, // Using citizen connection instead of admin
      {
        sectionCode: section.id,
        body: {} satisfies IEconomicDiscussionSection.IUpdate,
      },
    );
  });
}
