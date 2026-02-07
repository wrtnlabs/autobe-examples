import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
export async function test_api_section_detail_description_min_length(connection: api.IConnection) {
    const sectionConnection: api.IConnection = { host: connection.host };
    const sectionId = "00000000-0000-0000-0000-000000000001";
    const section = await api.functional.economyPoliticsBoard.sections.at(sectionConnection, {
        sectionId: sectionId,
    });
    typia.assert(section);
    TestValidator.equals("description length", section.description.length, 20);
}