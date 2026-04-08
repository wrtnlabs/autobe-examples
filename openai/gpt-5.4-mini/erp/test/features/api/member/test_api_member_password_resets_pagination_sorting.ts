import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberPasswordReset";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_resets_pagination_sorting(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "Password123!",
            displayName: RandomGenerator.name(),
            avatarImageUrl: null,
            phoneNumber: null,
            href: "https://example.com/onboarding",
            referrer: "https://example.com/",
            ip: "127.0.0.1",
        } satisfies IErpHrmTimeMember.IJoin,
    });
    typia.assert(authorized);

    const query = async (
        sort: NonNullable<IErpHrmTimeMemberPasswordReset.IRequest["sort"]>,
        page: number,
        limit: number,
    ) => {
        const output = await api.functional.erpHrmTime.member.passwordResets.index(memberConnection, {
            body: {
                page,
                limit,
                sort,
            } satisfies IErpHrmTimeMemberPasswordReset.IRequest,
        });
        typia.assert(output);
        return output;
    };

    const sorts = [
        "createdAtAsc",
        "createdAtDesc",
        "expiresAtAsc",
        "expiresAtDesc",
    ] as const;

    for (const sort of sorts) {
        const firstPage = await query(sort, 1, 5);
        const secondPage = await query(sort, 2, 5);
        const missingPage = await query(sort, 999999, 5);

        TestValidator.predicate(`${sort} first page pagination current`, firstPage.pagination.current === 1);
        TestValidator.predicate(`${sort} first page pagination limit`, firstPage.pagination.limit === 5);
        TestValidator.predicate(`${sort} first page pagination records`, firstPage.pagination.records >= 0);
        TestValidator.predicate(`${sort} first page pagination pages`, firstPage.pagination.pages >= 0);
        TestValidator.equals(
            `${sort} first page data length`,
            firstPage.data.length,
            Math.min(firstPage.pagination.limit, firstPage.pagination.records),
        );

        TestValidator.predicate(`${sort} second page current`, secondPage.pagination.current === 2);
        TestValidator.predicate(`${sort} second page limit`, secondPage.pagination.limit === 5);
        TestValidator.equals(`${sort} second page records stable`, secondPage.pagination.records, firstPage.pagination.records);
        TestValidator.equals(`${sort} second page pages stable`, secondPage.pagination.pages, firstPage.pagination.pages);

        if (firstPage.data.length > 1) {
            const ordered = [...firstPage.data].sort((a, b) => {
                const left = sort === "createdAtAsc" || sort === "createdAtDesc" ? a.createdAt : a.expiresAt;
                const right = sort === "createdAtAsc" || sort === "createdAtDesc" ? b.createdAt : b.expiresAt;
                return sort.endsWith("Asc") ? left.localeCompare(right) : right.localeCompare(left);
            });
            TestValidator.equals(`${sort} first page ordering`, firstPage.data.map((row) => row.id), ordered.map((row) => row.id));
        }
        if (secondPage.data.length > 1) {
            const ordered = [...secondPage.data].sort((a, b) => {
                const left = sort === "createdAtAsc" || sort === "createdAtDesc" ? a.createdAt : a.expiresAt;
                const right = sort === "createdAtAsc" || sort === "createdAtDesc" ? b.createdAt : b.expiresAt;
                return sort.endsWith("Asc") ? left.localeCompare(right) : right.localeCompare(left);
            });
            TestValidator.equals(`${sort} second page ordering`, secondPage.data.map((row) => row.id), ordered.map((row) => row.id));
        }

        TestValidator.equals(`${sort} empty page data`, missingPage.data.length, 0);
        TestValidator.predicate(`${sort} empty page current`, missingPage.pagination.current === 999999);
        TestValidator.predicate(`${sort} empty page limit`, missingPage.pagination.limit === 5);
        TestValidator.equals(`${sort} empty page records stable`, missingPage.pagination.records, firstPage.pagination.records);
        TestValidator.equals(`${sort} empty page pages stable`, missingPage.pagination.pages, firstPage.pagination.pages);
    }

    const defaultPage = await query("createdAtDesc", 1, 10);
    const activeRows = defaultPage.data.filter((row) => row.deletedAt === null);
    TestValidator.equals("default results exclude soft-deleted rows", defaultPage.data.length, activeRows.length);
}
