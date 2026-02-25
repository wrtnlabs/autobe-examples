import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_admins_index_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Test unfiltered list with default pagination
  const allAdmins = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {}, // no filters
    },
  );
  typia.assert(allAdmins);
  allAdmins.data.forEach((admin) => {
    TestValidator.predicate(
      "email exists",
      typeof admin.email === "string" && admin.email.length > 0,
    );
    TestValidator.predicate(
      "displayName exists",
      typeof admin.displayName === "string" && admin.displayName.length > 0,
    );
    TestValidator.predicate(
      "deletedAt absent or null",
      admin.deletedAt === null || admin.deletedAt === undefined,
    );
  });
  // 2. Test filtering by email substring
  if (allAdmins.data.length > 0) {
    const sampleEmail = allAdmins.data[0].email;
    const emailSubstring = sampleEmail.substring(
      0,
      Math.min(5, sampleEmail.length),
    );
    if (emailSubstring.length > 0) {
      const filteredByEmail =
        await api.functional.communityPlatform.admins.index(adminConnection, {
          body: { email: emailSubstring },
        });
      typia.assert(filteredByEmail);
      filteredByEmail.data.forEach((admin) => {
        TestValidator.predicate(
          "filtered email contains substring",
          admin.email.includes(emailSubstring),
        );
      });
    }
  }
  // 3. Test filtering by displayName substring
  if (allAdmins.data.length > 0) {
    const sampleName = allAdmins.data[0].displayName;
    const nameSubstring = sampleName.substring(
      0,
      Math.min(5, sampleName.length),
    );
    if (nameSubstring.length > 0) {
      const filteredByName =
        await api.functional.communityPlatform.admins.index(adminConnection, {
          body: { displayName: nameSubstring },
        });
      typia.assert(filteredByName);
      filteredByName.data.forEach((admin) => {
        TestValidator.predicate(
          "filtered displayName contains substring",
          admin.displayName.includes(nameSubstring),
        );
      });
    }
  }
  // 4. Test filtering by deleted true (soft deleted)
  {
    const filteredDeleted = await api.functional.communityPlatform.admins.index(
      adminConnection,
      {
        body: { deleted: true },
      },
    );
    typia.assert(filteredDeleted);
    filteredDeleted.data.forEach((admin) => {
      TestValidator.predicate(
        "admin deletedAt not null when deleted=true",
        admin.deletedAt !== null && admin.deletedAt !== undefined,
      );
    });
  }
  // 5. Test filtering by deleted false (not deleted)
  {
    const filteredNotDeleted =
      await api.functional.communityPlatform.admins.index(adminConnection, {
        body: { deleted: false },
      });
    typia.assert(filteredNotDeleted);
    filteredNotDeleted.data.forEach((admin) => {
      TestValidator.predicate(
        "admin deletedAt null or undefined when deleted=false",
        admin.deletedAt === null || admin.deletedAt === undefined,
      );
    });
  }
  // 6. Test pagination: page and limit
  {
    const limit = 2;
    const page1 = await api.functional.communityPlatform.admins.index(
      adminConnection,
      {
        body: { page: 1, limit },
      },
    );
    typia.assert(page1);
    const page2 = await api.functional.communityPlatform.admins.index(
      adminConnection,
      {
        body: { page: 2, limit },
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 1 current", page1.pagination.current, 1);
    TestValidator.equals("page 1 limit", page1.pagination.limit, limit);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, limit);
    TestValidator.predicate(
      "page 1 <= total pages",
      page1.pagination.current <= page1.pagination.pages,
    );
    TestValidator.predicate(
      "page 2 <= total pages",
      page2.pagination.current <= page2.pagination.pages,
    );
    const idsPage1 = new Set(page1.data.map((a) => a.id));
    const idsPage2 = new Set(page2.data.map((a) => a.id));
    idsPage2.forEach((id) => {
      TestValidator.predicate(
        "no duplicated ids between pages",
        !idsPage1.has(id),
      );
    });
  }
}
