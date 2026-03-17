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
import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { AdminPayload } from "../decorators/payload/AdminPayload"
import { CommunityPlatformReportDismissalCollector } from "../collectors/CommunityPlatformReportDismissalCollector"
import { CommunityPlatformReportDismissalTransformer } from "../transformers/CommunityPlatformReportDismissalTransformer"

export async function postCommunityPlatformAdminReportsReportIdDismissals(props: {
    admin: AdminPayload;
    reportId: string & tags.Format<"uuid">;
    body: ICommunityPlatformReportDismissal.ICreate;
}): Promise<ICommunityPlatformReportDismissal> {
    // Verify admin exists
    const admin = await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
        where: { id: props.admin.id, deleted_at: null },
    });
    // Verify admin session exists
    const adminSession = await MyGlobal.prisma.community_platform_admin_sessions.findUniqueOrThrow({
        where: { id: props.admin.session_id },
    });
    // Fetch report with community
    const report = await MyGlobal.prisma.community_platform_content_reports.findUniqueOrThrow({
        where: { id: props.reportId },
        select: {
            id: true,
            status: true,
            community_id: true,
            community: {
                select: { id: true, name: true }
            },
        },
    });
    if (report.status !== 'pending') {
        throw new HttpException('Report is not pending', 400);
    }
    // Check for existing dismissal
    const existingDismissal = await MyGlobal.prisma.community_platform_report_dismissals.findUnique({
        where: { content_report_id: props.reportId },
    });
    if (existingDismissal) {
        throw new HttpException('Dismissal already exists for this report', 409);
    }
    // Find moderation role for this admin in the report's community
    const moderationRole = await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
            member_id: props.admin.id, // Assuming admin id maps to member_id
            community_id: report.community_id,
            deleted_at: null,
        },
    });
    if (!moderationRole) {
        throw new HttpException('You do not have moderation role in this community', 403);
    }
    // Fetch admin session
    const adminSession = await MyGlobal.prisma.community_platform_admin_sessions.findUniqueOrThrow({
        where: { id: props.admin.session_id },
    });
    // Create entities for collector
    const contentReportEntity: IEntity = { id: report.id };
    const moderationRoleEntity: IEntity = { id: moderationRole.id };
    const adminSessionEntity: IEntity = { id: adminSession.id };
    // Execute atomic transaction
    const result = await MyGlobal.prisma.$transaction(async (tx) => {
        // Create dismissal
        const dismissal = await tx.community_platform_report_dismissals.create({
            data: await CommunityPlatformReportDismissalCollector.collect({
                body: props.body,
                contentReport: contentReportEntity,
                moderationRole: moderationRoleEntity,
                communityPlatformAdminSessions: adminSessionEntity,
            }),
            ...CommunityPlatformReportDismissalTransformer.select(),
        });
        // Update report status with string timestamp
        await tx.community_platform_content_reports.update({
            where: { id: props.reportId },
            data: {
                status: 'dismissed',
                updated_at: new Date().toISOString()
            },
        });
        return dismissal;
    });
    return await CommunityPlatformReportDismissalTransformer.transform(result);
}
;
Need;
to;
fix: The;
admin;
payload;
is;
AdminPayload, but;
moderation_roles;
references;
member_id, not;
admin_id.This;
is;
a;
mismatch.Actually, community_platform_moderation_roles.member_id;
references;
community_platform_members.id, not;
admins.So;
the;
admin;
must;
also;
have;
a;
member;
record ? Or : ;
is;
admin;
a;
different;
actor ? The : ;
specification;
says;
'admin';
actor;
but;
moderation;
roles;
are;
assigned;
to;
members.Need;
to;
check;
actor;
definitions.The;
admin;
might;
have;
a;
member_id;
reference.Let;
me;
check;
the;
analysis;
sections: admin;
has;
'Community Owner Authority';
but;
also;
'Moderator Role Assignment'.The;
admin;
payload;
has;
type: 'admin'.The;
moderation_roles;
table;
likely;
has;
member_id;
foreign;
key.So;
we;
need;
to;
find;
the;
member;
record;
associated;
with (this)
    admin.There;
should;
be;
a;
relationship;
between;
admins;
and;
members.
;
Let;
me;
request;
the;
community_platform_admins;
schema;
to;
understand;
the;
structure.Also;
need;
community_platform_moderation_roles;
schema.I;
'll need these entities before proceeding with collector. However, the draft already attempts this but may have incorrect assumptions about admin vs member.;
Let;
me;
revise;
with (corrected)
    entity;
fetching;
and;
proper;
date;
handling.Also;
need;
to;
ensure;
all;
Prisma;
queries;
use;
'satisfies';
for (type; safety.
; Final)
    implementation;
should: -Verify;
admin;
session;
exists
    - Find;
admin;
's member record (or use admin directly if different)
    - Fetch;
report;
with (community
    - Check)
    admin;
's moderation role for that community
    - Use;
collector;
with (proper)
    entities
        - Update;
report;
status;
with (timestamp)
    string
        - Return;
transformed;
result;
I;
'll now write the final corrected version with all improvements applied.;
Also;
need;
to;
import AdminPayload = type;


from;
appropriate;
location - it;
's not imported in the provided code snippet. Should import from the decorators path. And import the collector and transformer functions.;


Let;
me;
produce;
final;
corrected;
code.;
