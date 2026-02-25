import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditReport";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_reports_list_pending_for_community(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "testPass!123",
            username: RandomGenerator.name(),
        },
    });
    const response = await api.functional.reddit.member.reports.index(memberConnection, {
        body: {
            status: "pending",
        },
    });
    typia.assert(response);
    TestValidator.predicate("At least one pending report", response.data.length > 0);
    response.data.forEach(report => {
        TestValidator.equals("Report status", report.status, "pending");
        TestValidator.predicate("Reason at least 20 characters", report.reason.length >= 20);
        TestValidator.predicate("Reason at most 500 characters", report.reason.length <= 500);
    });
}