import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { MemberPayload } from "../decorators/payload/MemberPayload"

export async function patchHrmPlatformMemberTimers(props: {
    member: MemberPayload;
    body: IHrmPlatformTimer.IRequest;
}): Promise<IPageIHrmPlatformTimer.ISummary> {
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
            hrm_platform_user_id: props.member.id,
            deleted_at: null,
        },
    });
    if (employee === null) {
        throw new HttpException("Employee record not found", 404);
    }
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 100;
    const skip = (page - 1) * limit;
    const whereInput: Prisma.hrm_platform_timersWhereInput = {
        employee: {
            hrm_platform_organization_id: employee.hrm_platform_organization_id,
            deleted_at: null,
        },
        deleted_at: null,
        ...(props.body.employee_id && {
            employee_id: props.body.employee_id,
        }),
        ...(props.body.project_id && {
            project_id: props.body.project_id,
        }),
        ...(props.body.task_id !== undefined && {
            task_id: props.body.task_id ?? null,
        }),
        ...(props.body.status === "active" && {
            stopped_at: null,
        }),
        ...(props.body.status === "stopped" && {
            stopped_at: {
                not: null,
            },
        }),
        ...(props.body.started_at_from && {
            started_at: {
                gte: new Date(props.body.started_at_from),
            },
        }),
        ...(props.body.started_at_to && {
            started_at: {
                lte: new Date(props.body.started_at_to),
            },
        }),
        ...(props.body.stopped_at_from !== undefined &&
            props.body.stopped_at_from !== null && {
            stopped_at: {
                gte: new Date(props.body.stopped_at_from),
            },
        }),
        ...(props.body.stopped_at_to !== undefined &&
            props.body.stopped_at_to !== null && {
            stopped_at: {
                lte: new Date(props.body.stopped_at_to),
            },
        }),
        ...(props.body.search && {
            description: {
                contains: props.body.search,
                mode: "insensitive",
            },
        }),
    } satisfies Prisma.hrm_platform_timersWhereInput;
    const orderByInput: Prisma.hrm_platform_timersOrderByWithRelationInput = props.body.sort_by
        ? props.body.sort_order === "asc"
            ? { [props.body.sort_by]: "asc" as const }
            : { [props.body.sort_by]: "desc" as const }
        : { created_at: "desc" as const };
    const timers = await MyGlobal.prisma.hrm_platform_timers.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        select: {
            id: true,
            employee_id: true,
            project_id: true,
            task_id: true,
            started_at: true,
            stopped_at: true,
            description: true,
            created_at: true,
            employee: {
                select: {
                    id: true,
                    position: true,
                    employment_type: true,
                    status: true,
                    hrm_platform_user_id: true,
                    hrm_platform_role_id: true,
                    hrm_platform_department_id: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            display_name: true,
                            avatar_image: true,
                            phone_number: true,
                        },
                    } satisfies Prisma.hrm_platform_membersFindManyArgs,
                    role: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            description: true,
                            is_builtin: true,
                            hrm_platform_role_permissions: {
                                select: {
                                    permission: {
                                        select: {
                                            code: true,
                                        },
                                    },
                                },
                            } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs,
                            created_at: true,
                            deleted_at: true,
                        },
                    } satisfies Prisma.hrm_platform_rolesFindManyArgs,
                    department: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            parent_department_id: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                            parent: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    parent_department_id: true,
                                    created_at: true,
                                    updated_at: true,
                                    deleted_at: true,
                                },
                            },
                        },
                    } satisfies Prisma.hrm_platform_departmentsFindManyArgs,
                    created_at: true,
                },
            } satisfies Prisma.hrm_platform_employeesFindManyArgs,
            project: {
                select: {
                    id: true,
                    name: true,
                    color_code: true,
                    status: true,
                    budget_hours: true,
                    start_date: true,
                    end_date: true,
                    hrm_platform_organization_id: true,
                    created_at: true,
                    updated_at: true,
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            logo_url: true,
                            currency: true,
                            timezone: true,
                            fiscal_start_month: true,
                            created_at: true,
                            updated_at: true,
                        },
                    } satisfies Prisma.hrm_platform_organizationsFindManyArgs,
                },
            } satisfies Prisma.hrm_platform_projectsFindManyArgs,
            task: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    estimated_hours: true,
                    due_date: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    hrm_platform_projects_id: true,
                    hrm_platform_tasks_id: true,
                    hrm_platform_employees_id: true,
                    project: {
                        select: {
                            id: true,
                            name: true,
                            color_code: true,
                            status: true,
                            budget_hours: true,
                            start_date: true,
                            end_date: true,
                            hrm_platform_organization_id: true,
                            created_at: true,
                            updated_at: true,
                        },
                    } satisfies Prisma.hrm_platform_projectsFindManyArgs,
                    assignedEmployee: {
                        select: {
                            id: true,
                            position: true,
                            employment_type: true,
                            status: true,
                            hrm_platform_user_id: true,
                            hrm_platform_role_id: true,
                            hrm_platform_department_id: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    display_name: true,
                                    avatar_image: true,
                                    phone_number: true,
                                },
                            },
                            role: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                    description: true,
                                    is_builtin: true,
                                    hrm_platform_role_permissions: {
                                        select: {
                                            permission: {
                                                select: {
                                                    code: true,
                                                },
                                            },
                                        },
                                    },
                                    created_at: true,
                                    deleted_at: true,
                                },
                            },
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    parent_department_id: true,
                                    created_at: true,
                                    updated_at: true,
                                    deleted_at: true,
                                },
                            },
                            created_at: true,
                        },
                    } satisfies Prisma.hrm_platform_employeesFindManyArgs,
                    parent: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            priority: true,
                            estimated_hours: true,
                            due_date: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                            hrm_platform_projects_id: true,
                            hrm_platform_tasks_id: true,
                            hrm_platform_employees_id: true,
                        },
                    },
                },
            } satisfies Prisma.hrm_platform_tasksFindManyArgs,
        },
    });
    const total = await MyGlobal.prisma.hrm_platform_timers.count({
        where: whereInput,
    });
    const now = new Date();
    const data = await ArrayUtil.asyncMap(timers, async (timer): Promise<IHrmPlatformTimer.ISummary> => {
        const durationMs = timer.stopped_at
            ? timer.stopped_at.getTime() - timer.started_at.getTime()
            : now.getTime() - timer.started_at.getTime();
        const duration_minutes = Math.round(durationMs / 60000);
        return {
            id: timer.id as string & tags.Format<"uuid">,
            employee: {
                id: timer.employee.id as string & tags.Format<"uuid">,
                position: timer.employee.position,
                employment_type: timer.employee.employment_type,
                status: timer.employee.status,
                user: {
                    id: timer.employee.user.id as string & tags.Format<"uuid">,
                    email: timer.employee.user.email as string & tags.Format<"email">,
                    display_name: timer.employee.user.display_name,
                    avatar_image: timer.employee.user.avatar_image
                        ? (timer.employee.user.avatar_image as string & tags.Format<"url">)
                        : undefined,
                    phone_number: timer.employee.user.phone_number,
                } satisfies IHrmPlatformMember.ISummary,
                role: {
                    id: timer.employee.role.id as string & tags.Format<"uuid">,
                    code: timer.employee.role.code,
                    name: timer.employee.role.name,
                    description: timer.employee.role.description,
                    is_builtin: timer.employee.role.is_builtin,
                    permissions: timer.employee.role.hrm_platform_role_permissions.map((rp) => rp.permission.code),
                    created_at: timer.employee.role.created_at.toISOString() as string & tags.Format<"date-time">,
                    deleted_at: timer.employee.role.deleted_at
                        ? (timer.employee.role.deleted_at.toISOString() as string & tags.Format<"date-time">)
                        : null,
                } satisfies IHrmPlatformRole.ISummary,
                department: timer.employee.department
                    ? {
                        id: timer.employee.department.id as string & tags.Format<"uuid">,
                        name: timer.employee.department.name,
                        description: timer.employee.department.description,
                        parent_department: timer.employee.department.parent
                            ? {
                                id: timer.employee.department.parent.id as string & tags.Format<"uuid">,
                                name: timer.employee.department.parent.name,
                                description: timer.employee.department.parent.description,
                                parent_department: null,
                                created_at: timer.employee.department.parent.created_at.toISOString(),
                                as, string
                            } & tags.Format<"date-time"> : ,
                        updated_at: timer.employee.department.parent.updated_at.toISOString(),
                        as, string
                    } & tags.Format<"date-time"> : ,
                deleted_at: timer.employee.department.parent.deleted_at
                    ? (timer.employee.department.parent.deleted_at.toISOString())
                    :
                ,
                as, string
            } & tags.Format<"date-time">
        };
    });
    undefined,
    ;
}
null,
    created_at;
timer.employee.department.created_at.toISOString() as string & tags.Format<"date-time">,
    updated_at;
timer.employee.department.updated_at.toISOString() as string & tags.Format<"date-time">,
    deleted_at;
timer.employee.department.deleted_at
    ? (timer.employee.department.deleted_at.toISOString() as string & tags.Format<"date-time">)
    : undefined,
;
null,
    created_at;
timer.employee.created_at.toISOString() as string & tags.Format<"date-time">,
;
satisfies;
IHrmPlatformEmployee.ISummary,
    project;
{
    id: timer.project.id as string & tags.Format<"uuid">,
        name;
    timer.project.name,
        color_code;
    timer.project.color_code,
        status;
    timer.project.status,
        budget_hours;
    timer.project.budget_hours,
        start_date;
    timer.project.start_date
        ? (timer.project.start_date.toISOString() as string & tags.Format<"date-time">)
        : undefined,
        end_date;
    timer.project.end_date
        ? (timer.project.end_date.toISOString() as string & tags.Format<"date-time">)
        : undefined,
        organization;
    {
        id: timer.project.organization.id as string & tags.Format<"uuid">,
            name;
        timer.project.organization.name,
            description;
        timer.project.organization.description,
            logo_url;
        timer.project.organization.logo_url
            ? (timer.project.organization.logo_url as string & tags.Format<"url">)
            : undefined,
            currency;
        timer.project.organization.currency,
            timezone;
        timer.project.organization.timezone,
            fiscal_start_month;
        timer.project.organization.fiscal_start_month,
            created_at;
        timer.project.organization.created_at.toISOString() as string & tags.Format<"date-time">,
            updated_at;
        timer.project.organization.updated_at.toISOString() as string & tags.Format<"date-time">,
        ;
    }
    satisfies;
    IHrmPlatformOrganization.ISummary,
        member_count;
    0,
        created_at;
    timer.project.created_at.toISOString() as string & tags.Format<"date-time">,
        updated_at;
    timer.project.updated_at.toISOString() as string & tags.Format<"date-time">,
    ;
}
satisfies;
IHrmPlatformProject.ISummary,
    task;
timer.task
    ? {
        id: timer.task.id as string & tags.Format<"uuid">,
        title: timer.task.title,
        status: timer.task.status,
        priority: timer.task.priority,
        estimated_hours: timer.task.estimated_hours,
        due_date: timer.task.due_date
            ? (timer.task.due_date.toISOString() as string & tags.Format<"date-time">)
            : undefined,
        created_at: timer.task.created_at.toISOString() as string & tags.Format<"date-time">,
        updated_at: timer.task.updated_at.toISOString() as string & tags.Format<"date-time">,
        deleted_at: timer.task.deleted_at.toISOString() as string & tags.Format<"date-time">,
        project: {
            id: timer.task.project.id as string & tags.Format<"uuid">,
            name: timer.task.project.name,
            color_code: timer.task.project.color_code,
            status: timer.task.project.status,
            budget_hours: timer.task.project.budget_hours,
            start_date: timer.task.project.start_date
                ? (timer.task.project.start_date.toISOString() as string & tags.Format<"date-time">)
                : undefined,
            end_date: timer.task.project.end_date
                ? (timer.task.project.end_date.toISOString() as string & tags.Format<"date-time">)
                : undefined,
            organization: {
                id: timer.task.project.organization.id as string & tags.Format<"uuid">,
                name: timer.task.project.organization.name,
                description: timer.task.project.organization.description,
                logo_url: timer.task.project.organization.logo_url
                    ? (timer.task.project.organization.logo_url as string & tags.Format<"url">)
                    : undefined,
                currency: timer.task.project.organization.currency,
                timezone: timer.task.project.organization.timezone,
                fiscal_start_month: timer.task.project.organization.fiscal_start_month,
                created_at: timer.task.project.organization.created_at.toISOString() as string & tags.Format<"date-time">,
                updated_at: timer.task.project.organization.updated_at.toISOString() as string & tags.Format<"date-time">,
            } satisfies IHrmPlatformOrganization.ISummary,
            member_count: 0,
            created_at: timer.task.project.created_at.toISOString() as string & tags.Format<"date-time">,
            updated_at: timer.task.project.updated_at.toISOString() as string & tags.Format<"date-time">,
        } satisfies IHrmPlatformProject.ISummary,
        assignedEmployee: timer.task.assignedEmployee
            ? {
                id: timer.task.assignedEmployee.id as string & tags.Format<"uuid">,
                position: timer.task.assignedEmployee.position,
                employment_type: timer.task.assignedEmployee.employment_type,
                status: timer.task.assignedEmployee.status,
                user: {
                    id: timer.task.assignedEmployee.user.id as string & tags.Format<"uuid">,
                    email: timer.task.assignedEmployee.user.email as string & tags.Format<"email">,
                    display_name: timer.task.assignedEmployee.user.display_name,
                    avatar_image: timer.task.assignedEmployee.user
                        .avatar_image
                        ? (timer.task.assignedEmployee.user.avatar_image as string & tags.Format<"url">)
                        : undefined,
                    phone_number: timer.task.assignedEmployee.user.phone_number,
                } satisfies IHrmPlatformMember.ISummary,
                role: {
                    id: timer.task.assignedEmployee.role.id as string & tags.Format<"uuid">,
                    code: timer.task.assignedEmployee.role.code,
                    name: timer.task.assignedEmployee.role.name,
                    description: timer.task.assignedEmployee.role.description,
                    is_builtin: timer.task.assignedEmployee.role.is_builtin,
                    permissions: timer.task.assignedEmployee.role
                        .hrm_platform_role_permissions.map((rp) => rp.permission.code),
                    created_at: timer.task.assignedEmployee.role.created_at.toISOString(),
                    as, string
                } & tags.Format<"date-time">,
                deleted_at: timer.task.assignedEmployee.role.deleted_at
                    ? (timer.task.assignedEmployee.role.deleted_at.toISOString())
                    :
                ,
                as, string
            } & tags.Format<"date-time"> : ,
        null: ,
    } satisfies IHrmPlatformRole.ISummary : ,
    department;
timer.task.assignedEmployee.department
    ? {
        id: timer.task.assignedEmployee.department.id as string & tags.Format<"uuid">,
        name: timer.task.assignedEmployee.department.name,
        description: timer.task.assignedEmployee.department.description,
        parent_department: timer.task.assignedEmployee.department.parent
            ? {
                id: timer.task.assignedEmployee.department.parent
                    .id as string & tags.Format<"uuid">,
                name: timer.task.assignedEmployee.department.parent
                    .name,
                description: timer.task.assignedEmployee.department.parent
                    .description,
                parent_department: null,
                created_at: timer.task.assignedEmployee.department.parent
                    .created_at.toISOString() as string & tags.Format<"date-time">,
                updated_at: timer.task.assignedEmployee.department.parent
                    .updated_at.toISOString() as string & tags.Format<"date-time">,
                deleted_at: timer.task.assignedEmployee.department.parent
                    .deleted_at
                    ? (timer.task.assignedEmployee.department
                        .parent.deleted_at.toISOString() as string & tags.Format<"date-time">)
                    : undefined,
            }
            : null,
        created_at: timer.task.assignedEmployee.department.created_at.toISOString(),
        as, string
    } & tags.Format<"date-time"> : ,
    updated_at;
timer.task.assignedEmployee.department.updated_at.toISOString();
as;
string & tags.Format<"date-time">,
    deleted_at;
timer.task.assignedEmployee.department.deleted_at
    ? (timer.task.assignedEmployee.department.deleted_at.toISOString())
    :
;
as;
string & tags.Format<"date-time">;
undefined,
;
null,
    created_at;
timer.task.assignedEmployee.created_at.toISOString() as string & tags.Format<"date-time">,
;
undefined,
    parent;
timer.task.parent
    ? {
        id: timer.task.parent.id as string & tags.Format<"uuid">,
        title: timer.task.parent.title,
        status: timer.task.parent.status,
        priority: timer.task.parent.priority,
        estimated_hours: timer.task.parent.estimated_hours,
        due_date: timer.task.parent.due_date
            ? (timer.task.parent.due_date.toISOString() as string & tags.Format<"date-time">)
            : undefined,
        created_at: timer.task.parent.created_at.toISOString() as string & tags.Format<"date-time">,
        updated_at: timer.task.parent.updated_at.toISOString() as string & tags.Format<"date-time">,
        deleted_at: timer.task.parent.deleted_at.toISOString() as string & tags.Format<"date-time">,
        project: {
            id: timer.task.parent.project.id as string & tags.Format<"uuid">,
            name: timer.task.parent.project.name,
            color_code: timer.task.parent.project.color_code,
            status: timer.task.parent.project.status,
            budget_hours: timer.task.parent.project.budget_hours,
            start_date: timer.task.parent.project.start_date
                ? (timer.task.parent.project.start_date.toISOString())
                :
            ,
            as, string
        } & tags.Format<"date-time">,
        undefined,
        end_date: timer.task.parent.project.end_date
            ? (timer.task.parent.project.end_date.toISOString())
            :
        ,
        as, string
    } & tags.Format<"date-time"> : ;
undefined,
    organization;
{
    id: timer.task.parent.project.organization.id as string & tags.Format<"uuid">,
        name;
    timer.task.parent.project.organization.name,
        description;
    timer.task.parent.project.organization.description,
        logo_url;
    timer.task.parent.project.organization.logo_url
        ? (timer.task.parent.project.organization.logo_url as string & tags.Format<"url">)
        : undefined,
        currency;
    timer.task.parent.project.organization.currency,
        timezone;
    timer.task.parent.project.organization.timezone,
        fiscal_start_month;
    timer.task.parent.project.organization.fiscal_start_month,
        created_at;
    timer.task.parent.project.organization.created_at.toISOString();
    as;
    string & tags.Format<"date-time">,
        updated_at;
    timer.task.parent.project.organization.updated_at.toISOString();
    as;
    string & tags.Format<"date-time">,
    ;
}
satisfies;
IHrmPlatformOrganization.ISummary,
    member_count;
0,
    created_at;
timer.task.parent.project.created_at.toISOString() as string & tags.Format<"date-time">,
    updated_at;
timer.task.parent.project.updated_at.toISOString() as string & tags.Format<"date-time">,
;
satisfies;
IHrmPlatformProject.ISummary,
    assignedEmployee;
timer.task.parent.assignedEmployee
    ? {
        id: timer.task.parent.assignedEmployee.id as string & tags.Format<"uuid">,
        position: timer.task.parent.assignedEmployee.position,
        employment_type: timer.task.parent.assignedEmployee.employment_type,
        status: timer.task.parent.assignedEmployee.status,
        user: {
            id: timer.task.parent.assignedEmployee.user.id as string & tags.Format<"uuid">,
            email: timer.task.parent.assignedEmployee.user.email as string & tags.Format<"email">,
            display_name: timer.task.parent.assignedEmployee.user.display_name,
            avatar_image: timer.task.parent.assignedEmployee.user
                .avatar_image
                ? (timer.task.parent.assignedEmployee.user
                    .avatar_image as string & tags.Format<"url">)
                : undefined,
            phone_number: timer.task.parent.assignedEmployee.user.phone_number,
        } satisfies IHrmPlatformMember.ISummary,
        role: {
            id: timer.task.parent.assignedEmployee.role.id as string & tags.Format<"uuid">,
            code: timer.task.parent.assignedEmployee.role.code,
            name: timer.task.parent.assignedEmployee.role.name,
            description: timer.task.parent.assignedEmployee.role.description,
            is_builtin: timer.task.parent.assignedEmployee.role.is_builtin,
            permissions: timer.task.parent.assignedEmployee.role
                .hrm_platform_role_permissions.map((rp) => rp.permission.code),
            created_at: timer.task.parent.assignedEmployee.role.created_at.toISOString(),
            as, string
        } & tags.Format<"date-time">,
        deleted_at: timer.task.parent.assignedEmployee.role.deleted_at
            ? (timer.task.parent.assignedEmployee.role.deleted_at.toISOString())
            :
        ,
        as, string
    } & tags.Format<"date-time"> : ;
null,
;
satisfies;
IHrmPlatformRole.ISummary,
    department;
timer.task.parent.assignedEmployee.department
    ? {
        id: timer.task.parent.assignedEmployee.department
            .id as string & tags.Format<"uuid">,
        name: timer.task.parent.assignedEmployee.department
            .name,
        description: timer.task.parent.assignedEmployee.department
            .description,
        parent_department: timer.task.parent.assignedEmployee.department
            .parent
            ? {
                id: timer.task.parent.assignedEmployee
                    .department.parent.id as string & tags.Format<"uuid">,
                name: timer.task.parent.assignedEmployee
                    .department.parent.name,
                description: timer.task.parent.assignedEmployee
                    .department.parent.description,
                parent_department: null,
                created_at: timer.task.parent.assignedEmployee
                    .department.parent.created_at.toISOString(),
                as, string
            } &
                tags.Format<"date-time"> : ,
        updated_at: timer.task.parent.assignedEmployee
            .department.parent.updated_at.toISOString(),
        as, string
    } &
        tags.Format<"date-time"> : ,
    deleted_at;
timer.task.parent.assignedEmployee
    .department.parent.deleted_at
    ? (timer.task.parent.assignedEmployee
        .department.parent.deleted_at.toISOString())
    :
;
as;
string &
    tags.Format<"date-time">;
undefined,
;
null,
    created_at;
timer.task.parent.assignedEmployee.department
    .created_at.toISOString() as string & tags.Format<"date-time">,
    updated_at;
timer.task.parent.assignedEmployee.department
    .updated_at.toISOString() as string & tags.Format<"date-time">,
    deleted_at;
timer.task.parent.assignedEmployee.department
    .deleted_at
    ? (timer.task.parent.assignedEmployee.department
        .deleted_at.toISOString() as string & tags.Format<"date-time">)
    : undefined,
;
null,
    created_at;
timer.task.parent.assignedEmployee.created_at.toISOString();
as;
string & tags.Format<"date-time">,
;
undefined,
    parent;
null,
;
undefined,
;
undefined,
    started_at;
timer.started_at.toISOString() as string & tags.Format<"date-time">,
    stopped_at;
timer.stopped_at
    ? (timer.stopped_at.toISOString() as string & tags.Format<"date-time">)
    : undefined,
    description;
timer.description,
    duration_minutes;
duration_minutes as number & tags.Type<"int32">,
    created_at;
timer.created_at.toISOString() as string & tags.Format<"date-time">,
;
satisfies;
IHrmPlatformTimer.ISummary;
;
return {
    pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
} satisfies IPageIHrmPlatformTimer.ISummary;
