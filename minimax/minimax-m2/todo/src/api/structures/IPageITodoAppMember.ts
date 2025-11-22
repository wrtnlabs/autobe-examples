import { IPage } from "./IPage";
import { ITodoAppMember } from "./ITodoAppMember";

export namespace IPageITodoAppMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppMember.ISummary[];
  };
}
