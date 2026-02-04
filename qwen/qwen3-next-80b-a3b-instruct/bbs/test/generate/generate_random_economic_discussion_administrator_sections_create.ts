import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_discussion_section } from "../prepare/prepare_random_economic_discussion_section";

export async function generate_random_economic_discussion_administrator_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicDiscussionSection.ICreate>;
  },
): Promise<IEconomicDiscussionSection> {
  const prepared: IEconomicDiscussionSection.ICreate =
    prepare_random_economic_discussion_section(props.body);
  const result: IEconomicDiscussionSection =
    await api.functional.economicDiscussion.administrator.sections.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
