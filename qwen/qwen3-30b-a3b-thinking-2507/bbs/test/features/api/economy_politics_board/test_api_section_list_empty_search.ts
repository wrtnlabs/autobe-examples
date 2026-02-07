import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSection";
export async function test_api_section_list_empty_search(connection: api.IConnection): Promise<void> {
    const output = await api.functional.economyPoliticsBoard.sections.index(connection, {
        body: {
            search: 'NonExistentSection',
            page: 1,
            limit: 20
        }
    });
    typia.assert(output);
    TestValidator.equals("pagination.current", output.pagination.current, 1);
    TestValidator.equals("pagination.limit", output.pagination.limit, 20);
    TestValidator.equals("pagination.records", output.pagination.records, 0);
    TestValidator.equals("pagination.pages", output.pagination.pages, 0);
    TestValidator.equals("data.length", output.data.length, 0);
}