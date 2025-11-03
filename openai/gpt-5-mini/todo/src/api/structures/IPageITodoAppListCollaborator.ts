import { IPage } from "./IPage";
import { ITodoAppListCollaborator } from "./ITodoAppListCollaborator";

export namespace IPageITodoAppListCollaborator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppListCollaborator.ISummary[];
  };
}
