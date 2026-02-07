import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { prepare_random_economy_politics_board_administrator_request } from "../../../prepare/prepare_random_economy_politics_board_administrator_request";
import { generate_random_economy_politics_board_user_administrator_requests_create } from "../../../generate/generate_random_economy_politics_board_user_administrator_requests_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_administrator_request_update_approve(connection: api.IConnection): Promise<void> {
    // 1. Auth as admin
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "admin123",
        },
    });
    
    // 2. Auth as regular user to create administrator request
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "user123",
        },
    });
    
    // 3. Create administrator request as regular user
    const request = await generate_random_economy_politics_board_user_administrator_requests_create(userConnection, {
        body: {
            reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
    });
    typia.assert(request);
    
    // 4. Update the request as admin
    const updatedRequest = await api.functional.economyPoliticsBoard.admin.administrator_requests.update(adminConnection, {
        requestId: request.id,
        body: {
            status: "approved",
            reason: "Admin request approved - this is a detailed justification",
        },
    });
    typia.assert(updatedRequest);
    
    // 5. Validate the status has been updated
    TestValidator.equals("status should be 'approved'", updatedRequest.status, "approved");
    
    // 6. Validate the reason has been updated
    TestValidator.equals("reason should be correct", updatedRequest.reason, "Admin request approved - this is a detailed justification");
}