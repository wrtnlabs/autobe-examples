import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { prepare_random_discussion_board_system_health_metric_metadatum } from "../../../prepare/prepare_random_discussion_board_system_health_metric_metadatum";
import { generate_random_discussion_board_super_admin_system_health_metrics_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_health_metrics_metadata_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_health_metric_metadata_update_non_existent_key(connection: api.IConnection): Promise<void> {
    // Create super administrator connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    
    // Create initial metadata record with 'environment' key
    const metricId = typia.random<string & tags.Format<"uuid">>();
    const initialMetadata = await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(superAdminConnection, {
        params: { metricId },
        body: {
            key: "environment",
            value: "production",
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
    });
    typia.assert(initialMetadata);
    
    // Attempt to update a non-existent metadata key 'region'
    await TestValidator.error("should fail when updating non-existent metadata key", async () => {
        await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.patchByMetricid(superAdminConnection, {
            metricId,
            body: {
                key: "region",
                value: "us-east-1",
            } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate,
        });
    });
}