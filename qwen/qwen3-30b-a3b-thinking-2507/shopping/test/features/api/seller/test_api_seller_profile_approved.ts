import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
export async function test_api_seller_profile_approved(connection: api.IConnection): Promise<void> {
    const sellerId = typia.random<string & tags.Format<"uuid">>();
    const response = await api.functional.ecommerce.sellers.profile.at(connection, {
        sellerId,
    });
    typia.assert(response);
    TestValidator.equals("approval_status should be 'approved'", response.approval_status, "approved");
    TestValidator.equals("deleted_at should be null", response.deleted_at, null);
}