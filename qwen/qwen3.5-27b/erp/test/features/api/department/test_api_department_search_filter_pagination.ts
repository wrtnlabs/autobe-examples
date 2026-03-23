import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test the search and filtering capabilities of the department listing endpoint.
 * Validates name search, description filtering, combined filters, pagination, and sorting.
 */
export async function test_api_department_search_filter_pagination(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    // 2. Create test departments with varied names and descriptions
    const departments: IHrmPlatformDepartment[] = [];
    // Create top-level departments
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Engineering",
            description: "Software development and technical operations",
        },
    }));
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Marketing",
            description: "Brand management and digital marketing campaigns",
        },
    }));
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Sales",
            description: "Customer acquisition and revenue generation",
        },
    }));
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Human Resources",
            description: "Employee management and organizational development",
        },
    }));
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Finance",
            description: "Financial planning and accounting operations",
        },
    }));
    // Create child departments (subdepartments)
    const engineeringId = departments[0].id;
    const marketingId = departments[1].id;
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Backend Development",
            description: "Server-side software engineering",
            parent_id: engineeringId,
        },
    }));
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Frontend Development",
            description: "Client-side software engineering",
            parent_id: engineeringId,
        },
    }));
    departments.push(await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: "Digital Marketing",
            description: "Online marketing and social media management",
            parent_id: marketingId,
        },
    }));
    // 3. Test name search (case-insensitive, partial match)
    const searchResult1 = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            search: "eng",
        },
    });
    typia.assert(searchResult1);
    TestValidator.equals("search eng matches Engineering and Backend Development", searchResult1.data.length, 3);
    TestValidator.predicate("all results contain eng in name", searchResult1.data.every((d) => d.name.toLowerCase().includes("eng")));
    // 4. Test case-insensitive search
    const searchResult2 = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            search: "ENGINEERING",
        },
    });
    typia.assert(searchResult2);
    TestValidator.equals("case-insensitive search ENGINEERING matches Engineering", searchResult2.data.some((d) => d.name === "Engineering"), true);
    // 5. Test description filtering
    const descriptionResult = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            description: "software",
        },
    });
    typia.assert(descriptionResult);
    TestValidator.predicate("description filter matches software departments", descriptionResult.data.every((d) => d.description?.toLowerCase().includes("software") ?? false));
    // 6. Test combined filters (search + description)
    const combinedResult = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            search: "development",
            description: "software",
        },
    });
    typia.assert(combinedResult);
    TestValidator.predicate("combined filter matches both search and description", combinedResult.data.every((d) => d.name.toLowerCase().includes("development") && (d.description?.toLowerCase().includes("software") ?? false)));
    // 7. Test parentId filter (get child departments)
    const childResult = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            parentId: engineeringId,
        },
    });
    typia.assert(childResult);
    TestValidator.equals("parentId filter returns child departments of Engineering", childResult.data.length, 2);
    TestValidator.predicate("all child departments belong to Engineering", childResult.data.every((d) => d.parent?.id === engineeringId));
    // 8. Test parentId filter (get top-level departments)
    const topLevelResult = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            parentId: null,
        },
    });
    typia.assert(topLevelResult);
    TestValidator.equals("parentId null returns top-level departments", topLevelResult.data.length, 5);
    TestValidator.predicate("all top-level departments have no parent", topLevelResult.data.every((d) => d.parent === null));
    // 9. Test pagination - page parameter
    const page1Result = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            page: 1,
            limit: 2,
        },
    });
    typia.assert(page1Result);
    TestValidator.equals("page 1 with limit 2 returns 2 departments", page1Result.data.length, 2);
    TestValidator.equals("pagination current page is 1", page1Result.pagination.current, 1);
    const page2Result = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            page: 2,
            limit: 2,
        },
    });
    typia.assert(page2Result);
    TestValidator.equals("page 2 with limit 2 returns next 2 departments", page2Result.data.length, 2);
    TestValidator.equals("pagination current page is 2", page2Result.pagination.current, 2);
    // 10. Test pagination - limit parameter
    const limitResult = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            limit: 5,
        },
    });
    typia.assert(limitResult);
    TestValidator.equals("limit 5 returns at most 5 departments", limitResult.data.length, 5);
    TestValidator.equals("pagination limit is 5", limitResult.pagination.limit, 5);
    // 11. Test sorting by name ascending (default)
    const sortNameAsc = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            sort: "name",
            order: "asc",
            limit: 100,
        },
    });
    typia.assert(sortNameAsc);
    TestValidator.predicate("departments sorted by name ascending", sortNameAsc.data.every((d, i, arr) => i === 0 || arr[i - 1].name.localeCompare(d.name) <= 0));
    // 12. Test sorting by name descending
    const sortNameDesc = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            sort: "name",
            order: "desc",
            limit: 100,
        },
    });
    typia.assert(sortNameDesc);
    TestValidator.predicate("departments sorted by name descending", sortNameDesc.data.every((d, i, arr) => i === 0 || arr[i - 1].name.localeCompare(d.name) >= 0));
    // 13. Test sorting by created_at
    const sortCreatedAt = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            sort: "created_at",
            order: "desc",
            limit: 100,
        },
    });
    typia.assert(sortCreatedAt);
    TestValidator.predicate("departments sorted by created_at descending", sortCreatedAt.data.every((d, i, arr) => i === 0 || new Date(arr[i - 1].created_at) >= new Date(d.created_at)));
    // 14. Test sorting by updated_at
    const sortUpdatedAt = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            sort: "updated_at",
            order: "asc",
            limit: 100,
        },
    });
    typia.assert(sortUpdatedAt);
    TestValidator.predicate("departments sorted by updated_at ascending", sortUpdatedAt.data.every((d, i, arr) => i === 0 || new Date(arr[i - 1].updated_at) <= new Date(d.updated_at)));
    // 15. Test pagination metadata
    const fullResult = await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
        body: {
            limit: 10,
        },
    });
    typia.assert(fullResult);
    TestValidator.equals("pagination records matches total departments", fullResult.pagination.records, departments.length);
    TestValidator.predicate("pagination pages calculated correctly", fullResult.pagination.pages ===
        Math.ceil(fullResult.pagination.records / fullResult.pagination.limit));
}