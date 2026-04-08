import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_retrieval_with_valid_uuid(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for testing admin retrieval
  const adminId = typia.random<string & tags.Format<"uuid">>();
  // Call the admin retrieval endpoint
  const admin = await api.functional.erpHrm.admins.at(connection, {
    adminId,
  });
  // Validate response with typia.assert - ensures complete type validation
  typia.assert(admin);
  // Validate id matches the requested adminId
  TestValidator.equals("admin id matches requested", admin.id, adminId);
  // Validate required fields
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
  TestValidator.predicate(
    "email is non-empty string",
    typeof admin.email === "string" && admin.email.length > 0,
  );
  TestValidator.predicate(
    "display_name is non-empty string",
    typeof admin.display_name === "string" && admin.display_name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(admin.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(admin.updated_at)),
  );
  // Validate optional fields structure (may be present or null)
  if (admin.avatar_uri !== undefined && admin.avatar_uri !== null) {
    TestValidator.predicate(
      "avatar_uri is valid URI format",
      /^https?:\/\/.+/i.test(admin.avatar_uri),
    );
  }
  if (admin.phone !== undefined && admin.phone !== null) {
    TestValidator.predicate(
      "phone is non-empty string",
      typeof admin.phone === "string" && admin.phone.length > 0,
    );
  }
  // Security validation: password_hash must NEVER be present in response
  TestValidator.predicate(
    "password_hash is not exposed",
    !("password_hash" in admin),
  );
}
